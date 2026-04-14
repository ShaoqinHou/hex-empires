/**
 * AI Personality Comparison Tool
 *
 * Runs 3 separate AI matches, each with a different leader as the dominant AI,
 * and compares how they play differently.
 */
import { chromium } from '@playwright/test';

const LEADERS_TO_TEST = ['Augustus', 'Genghis Khan', 'Gandhi'];
const TURNS = 50;

const browser = await chromium.launch({ headless: true });

for (const leader of LEADERS_TO_TEST) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:5174');
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  await page.waitForTimeout(300);

  // Try to pick the specific leader
  const leaderBtn = page.getByRole('button', { name: new RegExp(leader, 'i') });
  if (await leaderBtn.count() > 0) await leaderBtn.first().click();

  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(300);

  for (let i = 0; i < TURNS; i++) {
    await page.evaluate(() => window.__gameDispatch({ type: 'END_TURN' }));
    await page.waitForTimeout(30);
    const o = page.locator('.fixed.inset-0.z-50');
    if (await o.count() > 0) await o.click({ timeout: 300 }).catch(() => {});
  }

  const result = await page.evaluate((leaderName) => {
    const s = window.__gameState;
    const ai = [...s.players.entries()].find(([id, p]) => !p.isHuman);
    if (!ai) return null;
    const [id, p] = ai;
    const units = [...s.units.values()].filter(u => u.owner === id);
    const cities = [...s.cities.values()].filter(c => c.owner === id);

    const unitCounts = {};
    for (const u of units) {
      const cat = s.config.units.get(u.typeId)?.category ?? 'unknown';
      unitCounts[cat] = (unitCounts[cat] || 0) + 1;
    }

    const combatEvents = s.log.filter(e => e.playerId === id && e.type === 'combat').length;

    return {
      leader: p.leaderId,
      civ: p.civilizationId,
      cities: cities.length,
      totalPop: cities.reduce((sum, c) => sum + c.population, 0),
      military: units.filter(u => {
        const def = s.config.units.get(u.typeId);
        return def && def.category !== 'civilian';
      }).length,
      unitCategories: unitCounts,
      techs: p.researchedTechs.length,
      civics: p.researchedCivics.length,
      gold: p.gold,
      combatEvents,
      age: p.age,
    };
  }, leader);

  console.log(`\n=== ${leader} (${TURNS} turns) ===`);
  console.log(JSON.stringify(result, null, 2));

  await page.close();
}

await browser.close();
