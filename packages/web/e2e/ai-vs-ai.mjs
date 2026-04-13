/**
 * AI vs AI Match Simulator
 *
 * Runs automated games between AI players with different personalities,
 * logs detailed turn-by-turn reports, and generates a match summary.
 *
 * Usage: node e2e/ai-vs-ai.mjs [turns=50]
 */
import { chromium } from '@playwright/test';

const MAX_TURNS = parseInt(process.argv[2] || '50', 10);

console.log(`\n${'='.repeat(60)}`);
console.log(`  AI vs AI Match — ${MAX_TURNS} turns`);
console.log(`${'='.repeat(60)}\n`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const errors = [];
page.on('pageerror', err => errors.push(err.message));

// Start game with 3 AI opponents
await page.goto('http://localhost:5174');
await page.waitForTimeout(500);

// Select 3 opponents
const aiBtn = page.getByRole('button', { name: /3\s*opponents/i });
if (await aiBtn.count() > 0) await aiBtn.first().click();
await page.waitForTimeout(100);

await page.getByRole('button', { name: /start game/i }).click();
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(300);

// Get initial state
const initialState = await page.evaluate(() => {
  const s = window.__gameState;
  return {
    players: [...s.players.entries()].map(([id, p]) => ({
      id, name: p.name, isHuman: p.isHuman,
      civ: p.civilizationId, leader: p.leaderId,
    })),
  };
});

console.log('Players:');
for (const p of initialState.players) {
  const role = p.isHuman ? 'HUMAN (auto-playing)' : 'AI';
  console.log(`  ${p.id}: ${p.leader}/${p.civ} [${role}]`);
}
console.log('');

// Auto-play: human player does nothing each turn (just end turn)
// This simulates the human doing nothing while AIs compete
const turnLog = [];

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  // End human turn (human does nothing — passive observer)
  await page.evaluate(() => window.__gameDispatch({ type: 'END_TURN' }));
  await page.waitForTimeout(150);

  // Dismiss transition
  const overlay = page.locator('.fixed.inset-0.z-50');
  if (await overlay.count() > 0) {
    await overlay.click({ timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(50);

  // Collect state every 5 turns or on significant events
  if (turn % 5 === 0 || turn === 1 || turn === MAX_TURNS) {
    const snapshot = await page.evaluate(() => {
      const s = window.__gameState;
      const result = { turn: s.turn, players: [] };

      for (const [id, p] of s.players) {
        const units = [...s.units.values()].filter(u => u.owner === id);
        const cities = [...s.cities.values()].filter(c => c.owner === id);
        const militaryUnits = units.filter(u => {
          const def = s.config.units.get(u.typeId);
          return def && def.category !== 'civilian';
        });

        const unitCounts = {};
        for (const u of units) unitCounts[u.typeId] = (unitCounts[u.typeId] || 0) + 1;

        result.players.push({
          id,
          civ: p.civilizationId,
          leader: p.leaderId,
          isHuman: p.isHuman,
          gold: p.gold,
          science: p.science,
          culture: p.culture,
          techs: p.researchedTechs.length,
          techList: [...p.researchedTechs],
          research: p.currentResearch,
          cities: cities.length,
          totalPop: cities.reduce((sum, c) => sum + c.population, 0),
          cityNames: cities.map(c => `${c.name}(pop${c.population})`),
          units: units.length,
          military: militaryUnits.length,
          unitBreakdown: unitCounts,
        });
      }

      // Check for combat events this turn range
      const recentEvents = s.log
        .filter(e => e.turn >= s.turn - 4 && (e.type === 'combat' || e.type === 'city'))
        .map(e => `[T${e.turn}] ${e.playerId}: ${e.message}`);

      result.events = recentEvents;
      return result;
    });

    turnLog.push(snapshot);

    console.log(`--- Turn ${snapshot.turn} ---`);
    for (const p of snapshot.players) {
      const label = p.isHuman ? '👤' : '🤖';
      console.log(`  ${label} ${p.leader}/${p.civ}: Gold=${p.gold} Techs=${p.techs} Cities=${p.cities} Pop=${p.totalPop} Units=${p.units}(mil:${p.military})`);
      if (p.cities > 0) console.log(`     Cities: ${p.cityNames.join(', ')}`);
      if (Object.keys(p.unitBreakdown).length > 0) console.log(`     Units: ${JSON.stringify(p.unitBreakdown)}`);
    }
    if (snapshot.events && snapshot.events.length > 0) {
      console.log(`  Events:`);
      for (const e of snapshot.events.slice(0, 5)) console.log(`    ${e}`);
    }
  }
}

// Final analysis
console.log(`\n${'='.repeat(60)}`);
console.log('  MATCH SUMMARY');
console.log(`${'='.repeat(60)}`);

const finalSnapshot = turnLog[turnLog.length - 1];
const rankings = [...finalSnapshot.players]
  .sort((a, b) => {
    // Score: cities*100 + pop*20 + techs*30 + military*10 + gold*0.5
    const scoreA = a.cities * 100 + a.totalPop * 20 + a.techs * 30 + a.military * 10 + a.gold * 0.5;
    const scoreB = b.cities * 100 + b.totalPop * 20 + b.techs * 30 + b.military * 10 + b.gold * 0.5;
    return scoreB - scoreA;
  });

console.log('\nRankings (by composite score):');
for (let i = 0; i < rankings.length; i++) {
  const p = rankings[i];
  const score = p.cities * 100 + p.totalPop * 20 + p.techs * 30 + p.military * 10 + p.gold * 0.5;
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
  console.log(`  ${medal} #${i + 1} ${p.leader}/${p.civ}: Score=${Math.round(score)} (${p.cities} cities, pop ${p.totalPop}, ${p.techs} techs, ${p.military} military, ${p.gold}g)`);
}

console.log(`\nJS Errors: ${errors.length}`);
if (errors.length > 0) errors.slice(0, 3).forEach(e => console.log(`  ${e}`));

console.log(`\nMatch completed: ${MAX_TURNS} turns in ${finalSnapshot.turn} game turns`);

await browser.close();
