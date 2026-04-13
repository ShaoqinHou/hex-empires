# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-and-map.spec.ts >> AI Behavior: Development >> AI city population grows over time
- Location: e2e\ai-and-map.spec.ts:275:3

# Error details

```
TypeError: Cannot read properties of null (reading 'cities')
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "Hex Empires" [level=1] [ref=e5]
    - paragraph [ref=e6]: A new age awaits
  - generic [ref=e7]:
    - generic [ref=e8]:
      - heading "Choose Your Leader" [level=2] [ref=e9]
      - generic [ref=e10]:
        - button "Augustus" [ref=e11] [cursor=pointer]:
          - generic [ref=e12]: A
          - generic [ref=e13]: Augustus
        - button "Cleopatra" [ref=e14] [cursor=pointer]:
          - generic [ref=e15]: C
          - generic [ref=e16]: Cleopatra
        - button "Pericles" [ref=e17] [cursor=pointer]:
          - generic [ref=e18]: P
          - generic [ref=e19]: Pericles
        - button "Cyrus" [ref=e20] [cursor=pointer]:
          - generic [ref=e21]: C
          - generic [ref=e22]: Cyrus
        - button "Gandhi" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]: G
          - generic [ref=e25]: Gandhi
        - button "Qin Shi Huang" [ref=e26] [cursor=pointer]:
          - generic [ref=e27]: Q
          - generic [ref=e28]: Qin Shi Huang
        - button "Alexander" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: A
          - generic [ref=e31]: Alexander
        - button "Hatshepsut" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: H
          - generic [ref=e34]: Hatshepsut
        - button "Genghis Khan" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: G
          - generic [ref=e37]: Genghis Khan
      - generic [ref=e38]:
        - generic [ref=e39]: "Pax Romana:"
        - text: +5 combat strength when defending. Cities grow 10% faster.
    - generic [ref=e41]:
      - heading "Choose Your Civilization" [level=2] [ref=e42]
      - generic [ref=e43]:
        - button "Rome" [ref=e44] [cursor=pointer]:
          - generic [ref=e45]: R
          - generic [ref=e46]: Rome
        - button "Egypt" [ref=e47] [cursor=pointer]:
          - generic [ref=e48]: E
          - generic [ref=e49]: Egypt
        - button "Greece" [ref=e50] [cursor=pointer]:
          - generic [ref=e51]: G
          - generic [ref=e52]: Greece
        - button "Persia" [ref=e53] [cursor=pointer]:
          - generic [ref=e54]: P
          - generic [ref=e55]: Persia
        - button "India" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: I
          - generic [ref=e58]: India
        - button "China" [ref=e59] [cursor=pointer]:
          - generic [ref=e60]: C
          - generic [ref=e61]: China
      - generic [ref=e62]:
        - generic [ref=e63]: "All Roads Lead to Rome:"
        - text: Trade routes to your capital provide bonus gold. +1 production in all cities.
    - generic [ref=e65]:
      - generic [ref=e67]:
        - heading "Map Size" [level=2] [ref=e68]
        - generic [ref=e69]:
          - button "Small 40x30" [ref=e70] [cursor=pointer]:
            - generic [ref=e71]: Small
            - generic [ref=e72]: 40x30
          - button "Medium 60x40" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: Medium
            - generic [ref=e75]: 60x40
          - button "Large 80x50" [ref=e76] [cursor=pointer]:
            - generic [ref=e77]: Large
            - generic [ref=e78]: 80x50
      - generic [ref=e80]:
        - heading "AI Opponents" [level=2] [ref=e81]
        - generic [ref=e82]:
          - button "1 opponent" [ref=e83] [cursor=pointer]:
            - generic [ref=e84]: "1"
            - generic [ref=e85]: opponent
          - button "2 opponents" [ref=e86] [cursor=pointer]:
            - generic [ref=e87]: "2"
            - generic [ref=e88]: opponents
          - button "3 opponents" [ref=e89] [cursor=pointer]:
            - generic [ref=e90]: "3"
            - generic [ref=e91]: opponents
    - button "Start Game →" [ref=e94] [cursor=pointer]
```

# Test source

```ts
  184 | 
  185 |     for (const unit of tileCheck) {
  186 |       if (!unit.onTile) {
  187 |         offTile.push(`${unit.typeId} (${unit.owner}) at ${unit.pos}`);
  188 |       }
  189 |     }
  190 | 
  191 |     // EXPECT: Zero units on invalid tiles after 15 turns of AI movement
  192 |     expect(offTile).toEqual([]);
  193 |   });
  194 | 
  195 |   test('no units on water tiles (land units only)', async ({ page }) => {
  196 |     await startGameWith(page, 1);
  197 | 
  198 |     // Play a few turns for AI to move
  199 |     for (let i = 0; i < 5; i++) {
  200 |       await endTurn(page);
  201 |     }
  202 | 
  203 |     const waterUnits = await page.evaluate(() => {
  204 |       const s = (window as any).__gameState;
  205 |       const issues: string[] = [];
  206 |       for (const [id, u] of s.units) {
  207 |         const key = `${u.position.q},${u.position.r}`;
  208 |         const tile = s.map.tiles.get(key);
  209 |         if (!tile) continue;
  210 |         const terrain = s.config.terrains.get(tile.terrain);
  211 |         if (terrain?.isWater) {
  212 |           const unitDef = s.config.units.get(u.typeId);
  213 |           if (unitDef?.category !== 'naval') {
  214 |             issues.push(`Land unit ${u.typeId} (${u.owner}) on water tile ${tile.terrain} at ${key}`);
  215 |           }
  216 |         }
  217 |       }
  218 |       return issues;
  219 |     });
  220 | 
  221 |     // EXPECT: No land units on water
  222 |     expect(waterUnits).toEqual([]);
  223 |   });
  224 | });
  225 | 
  226 | test.describe('AI Behavior: Development', () => {
  227 |   test('AI founds at least 1 city within 10 turns', async ({ page }) => {
  228 |     await startGameWith(page, 1);
  229 | 
  230 |     // Play 10 turns
  231 |     for (let i = 0; i < 10; i++) {
  232 |       await endTurn(page);
  233 |     }
  234 | 
  235 |     const state = await getFullState(page);
  236 |     const aiPlayers = state!.players.filter(p => !p.isHuman);
  237 |     const aiCities = state!.cities.filter(c => aiPlayers.some(p => p.id === c.owner));
  238 | 
  239 |     // EXPECT: AI has founded at least 1 city
  240 |     expect(aiCities.length).toBeGreaterThanOrEqual(1);
  241 |   });
  242 | 
  243 |   test('AI researches technology', async ({ page }) => {
  244 |     await startGameWith(page, 1);
  245 | 
  246 |     // Play 20 turns (enough for at least 1 tech)
  247 |     for (let i = 0; i < 20; i++) {
  248 |       await endTurn(page);
  249 |     }
  250 | 
  251 |     const state = await getFullState(page);
  252 |     const aiPlayer = state!.players.find(p => !p.isHuman)!;
  253 | 
  254 |     // EXPECT: AI has researched at least 1 tech or is actively researching
  255 |     const hasResearch = aiPlayer.researchedTechs.length > 0 || aiPlayer.currentResearch !== null;
  256 |     expect(hasResearch).toBe(true);
  257 |   });
  258 | 
  259 |   test('AI builds military units', async ({ page }) => {
  260 |     await startGameWith(page, 1);
  261 | 
  262 |     // Play 15 turns
  263 |     for (let i = 0; i < 15; i++) {
  264 |       await endTurn(page);
  265 |     }
  266 | 
  267 |     const state = await getFullState(page);
  268 |     const aiPlayers = state!.players.filter(p => !p.isHuman);
  269 |     const aiUnits = state!.units.filter(u => aiPlayers.some(p => p.id === u.owner));
  270 | 
  271 |     // EXPECT: AI has at least 1 unit remaining (they start with 3 but may lose some)
  272 |     expect(aiUnits.length).toBeGreaterThanOrEqual(1);
  273 |   });
  274 | 
  275 |   test('AI city population grows over time', async ({ page }) => {
  276 |     await startGameWith(page, 1);
  277 | 
  278 |     // Play 15 turns
  279 |     for (let i = 0; i < 15; i++) {
  280 |       await endTurn(page);
  281 |     }
  282 | 
  283 |     const state = await getFullState(page);
> 284 |     const aiCities = state!.cities.filter(c => {
      |                             ^ TypeError: Cannot read properties of null (reading 'cities')
  285 |       const owner = state!.players.find(p => p.id === c.owner);
  286 |       return owner && !owner.isHuman;
  287 |     });
  288 | 
  289 |     if (aiCities.length > 0) {
  290 |       // EXPECT: At least one AI city has grown beyond pop 1
  291 |       const maxPop = Math.max(...aiCities.map(c => c.population));
  292 |       expect(maxPop).toBeGreaterThanOrEqual(1);
  293 |     }
  294 |   });
  295 | 
  296 |   test('AI sets production in cities', async ({ page }) => {
  297 |     await startGameWith(page, 1);
  298 | 
  299 |     // Play 5 turns (AI should have city by turn 2-3 and set production)
  300 |     for (let i = 0; i < 5; i++) {
  301 |       await endTurn(page);
  302 |     }
  303 | 
  304 |     // Check each turn if AI has production set
  305 |     const aiProduction = await page.evaluate(() => {
  306 |       const s = (window as any).__gameState;
  307 |       const results: string[] = [];
  308 |       for (const [id, c] of s.cities) {
  309 |         const owner = s.players.get(c.owner);
  310 |         if (owner && !owner.isHuman) {
  311 |           if (c.productionQueue.length > 0) {
  312 |             results.push(`${c.name}: producing ${c.productionQueue[0].id}`);
  313 |           } else if (c.buildings.length > 1) {
  314 |             results.push(`${c.name}: ${c.buildings.length} buildings (production completed)`);
  315 |           }
  316 |         }
  317 |       }
  318 |       return results;
  319 |     });
  320 | 
  321 |     // EXPECT: AI cities have production activity (either queued or completed buildings)
  322 |     // Note: production may complete between checks, so buildings count works too
  323 |   });
  324 | });
  325 | 
  326 | test.describe('AI Behavior: Multiple AI Players', () => {
  327 |   test('2 AI opponents both develop independently', async ({ page }) => {
  328 |     await startGameWith(page, 2);
  329 | 
  330 |     // Play 12 turns
  331 |     for (let i = 0; i < 12; i++) {
  332 |       await endTurn(page);
  333 |     }
  334 | 
  335 |     const state = await getFullState(page);
  336 |     const aiPlayers = state!.players.filter(p => !p.isHuman);
  337 | 
  338 |     // EXPECT: 2 AI players exist
  339 |     expect(aiPlayers.length).toBe(2);
  340 | 
  341 |     // EXPECT: Both AIs have different civilizations
  342 |     expect(aiPlayers[0].civId).not.toBe(aiPlayers[1].civId);
  343 | 
  344 |     // EXPECT: Combined AI presence (cities + units) shows activity
  345 |     const totalAICities = state!.cities.filter(c => aiPlayers.some(p => p.id === c.owner)).length;
  346 |     const totalAIUnits = state!.units.filter(u => aiPlayers.some(p => p.id === u.owner)).length;
  347 |     expect(totalAICities + totalAIUnits).toBeGreaterThanOrEqual(2);
  348 |   });
  349 | 
  350 |   test('3 AI opponents all active', async ({ page }) => {
  351 |     await startGameWith(page, 3);
  352 | 
  353 |     // Play 10 turns
  354 |     for (let i = 0; i < 10; i++) {
  355 |       await endTurn(page);
  356 |     }
  357 | 
  358 |     const state = await getFullState(page);
  359 |     const aiPlayers = state!.players.filter(p => !p.isHuman);
  360 | 
  361 |     // EXPECT: 3 AI players
  362 |     expect(aiPlayers.length).toBe(3);
  363 | 
  364 |     // EXPECT: All 3 have distinct civilizations
  365 |     const civIds = new Set(aiPlayers.map(p => p.civId));
  366 |     expect(civIds.size).toBe(3);
  367 | 
  368 |     // EXPECT: AIs have some presence (units + cities combined)
  369 |     const totalAIPresence = state!.units.filter(u => aiPlayers.some(p => p.id === u.owner)).length
  370 |       + state!.cities.filter(c => aiPlayers.some(p => p.id === c.owner)).length;
  371 |     expect(totalAIPresence).toBeGreaterThanOrEqual(2);
  372 |   });
  373 | 
  374 |   test('1v1 produces different dynamics than 1v3', async ({ page }) => {
  375 |     // Play 1v1
  376 |     await startGameWith(page, 1);
  377 |     for (let i = 0; i < 8; i++) await endTurn(page);
  378 |     const state1v1 = await getFullState(page);
  379 | 
  380 |     // Play 1v3
  381 |     await startGameWith(page, 3);
  382 |     for (let i = 0; i < 8; i++) await endTurn(page);
  383 |     const state1v3 = await getFullState(page);
  384 | 
```