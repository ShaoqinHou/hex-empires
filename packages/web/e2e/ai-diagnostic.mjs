/**
 * AI Diagnostic Script — runs a 25-turn game and logs every detail
 * of AI behavior to identify problems.
 *
 * Run: node e2e/ai-diagnostic.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('http://localhost:5174');
await page.getByRole('button', { name: /start game/i }).click();
await page.waitForSelector('canvas', { timeout: 10000 });
await page.waitForTimeout(300);

// Found city + set research
await page.evaluate(() => {
  const s = window.__gameState;
  const settler = [...s.units.values()].find(u => u.typeId === 'settler' && u.owner === s.currentPlayerId);
  if (settler) window.__gameDispatch({ type: 'FOUND_CITY', unitId: settler.id, name: 'Capital' });
});
await page.waitForTimeout(100);
await page.evaluate(() => {
  const s = window.__gameState;
  const city = [...s.cities.values()][0];
  if (city) window.__gameDispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: 'warrior', itemType: 'unit' });
  window.__gameDispatch({ type: 'SET_RESEARCH', techId: 'pottery' });
});

console.log('=== AI BEHAVIOR DIAGNOSTIC (25 turns) ===\n');

for (let turn = 1; turn <= 25; turn++) {
  await page.evaluate(() => window.__gameDispatch({ type: 'END_TURN' }));
  await page.waitForTimeout(200);
  const overlay = page.locator('.fixed.inset-0.z-50');
  if (await overlay.count() > 0) await overlay.click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(100);

  const report = await page.evaluate(() => {
    const s = window.__gameState;
    const result = { turn: s.turn, ais: [], events: [] };

    for (const [id, p] of s.players) {
      if (p.isHuman) continue;
      const units = [...s.units.values()].filter(u => u.owner === id);
      const cities = [...s.cities.values()].filter(c => c.owner === id);

      const unitDetails = units.map(u => {
        const key = `${u.position.q},${u.position.r}`;
        const tile = s.map.tiles.get(key);
        return {
          type: u.typeId,
          pos: key,
          hp: u.health,
          mv: u.movementLeft,
          terrain: tile?.terrain || 'NO_TILE',
          onWater: tile ? (s.config.terrains.get(tile.terrain)?.isWater || false) : false,
        };
      });

      const cityDetails = cities.map(c => ({
        name: c.name,
        pop: c.population,
        prod: c.productionQueue[0]?.id || 'IDLE',
        buildings: c.buildings.length,
        food: c.food,
        type: c.settlementType,
      }));

      result.ais.push({
        id,
        civ: p.civilizationId,
        gold: p.gold,
        techs: p.researchedTechs,
        research: p.currentResearch,
        progress: p.researchProgress,
        units: unitDetails,
        cities: cityDetails,
      });
    }

    result.events = s.log.filter(e => e.turn === s.turn).map(e => ({
      player: e.playerId,
      type: e.type,
      msg: e.message,
    }));

    return result;
  });

  console.log(`--- Turn ${report.turn} ---`);
  for (const ai of report.ais) {
    const unitCounts = {};
    for (const u of ai.units) unitCounts[u.type] = (unitCounts[u.type] || 0) + 1;
    console.log(`  AI ${ai.civ} (${ai.id}):`);
    console.log(`    Gold: ${ai.gold} | Research: ${ai.research || 'NONE'} (${ai.progress}) | Techs: [${ai.techs.join(', ')}]`);
    console.log(`    Units (${ai.units.length}): ${JSON.stringify(unitCounts)}`);
    for (const u of ai.units) {
      const flag = u.hp < 100 ? ` DAMAGED(${u.hp}hp)` : '';
      const water = u.onWater ? ' ON_WATER!' : '';
      console.log(`      ${u.type} at ${u.pos} [${u.terrain}] mv=${u.mv}${flag}${water}`);
    }
    console.log(`    Cities (${ai.cities.length}):`);
    for (const c of ai.cities) {
      console.log(`      ${c.name} pop=${c.pop} prod=${c.prod} bldg=${c.buildings} food=${c.food} type=${c.type}`);
    }
  }
  // Only show combat/important events
  const importantEvents = report.events.filter(e =>
    e.type === 'combat' || e.type === 'city' || e.type === 'research' || e.type === 'production'
  );
  if (importantEvents.length > 0) {
    console.log(`  Events:`);
    for (const e of importantEvents) console.log(`    [${e.type}] ${e.player}: ${e.msg}`);
  }
}

console.log('\n=== END DIAGNOSTIC ===');
await browser.close();
