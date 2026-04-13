# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.ts >> Game loads and renders >> minimap renders as second canvas
- Location: e2e\game.spec.ts:33:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('canvas') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "Hex Empires" [level=1] [ref=e5]
    - paragraph [ref=e6]: Configure your empire before the age begins
  - generic [ref=e7]:
    - generic [ref=e8]:
      - heading "Choose Your Leader" [level=2] [ref=e9]
      - generic [ref=e10]:
        - button "A Augustus" [ref=e11] [cursor=pointer]:
          - generic [ref=e12]: A
          - generic [ref=e13]: Augustus
        - button "C Cleopatra" [ref=e14] [cursor=pointer]:
          - generic [ref=e15]: C
          - generic [ref=e16]: Cleopatra
        - button "P Pericles" [ref=e17] [cursor=pointer]:
          - generic [ref=e18]: P
          - generic [ref=e19]: Pericles
        - button "C Cyrus" [ref=e20] [cursor=pointer]:
          - generic [ref=e21]: C
          - generic [ref=e22]: Cyrus
        - button "G Gandhi" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]: G
          - generic [ref=e25]: Gandhi
        - button "Q Qin Shi Huang" [ref=e26] [cursor=pointer]:
          - generic [ref=e27]: Q
          - generic [ref=e28]: Qin Shi Huang
        - button "A Alexander" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: A
          - generic [ref=e31]: Alexander
        - button "H Hatshepsut" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: H
          - generic [ref=e34]: Hatshepsut
        - button "G Genghis Khan" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: G
          - generic [ref=e37]: Genghis Khan
      - generic [ref=e38]:
        - generic [ref=e39]: "Pax Romana:"
        - text: +5 combat strength when defending. Cities grow 10% faster.
    - generic [ref=e41]:
      - heading "Choose Your Civilization" [level=2] [ref=e42]
      - generic [ref=e43]:
        - button "R Rome" [ref=e44] [cursor=pointer]:
          - generic [ref=e45]: R
          - generic [ref=e46]: Rome
        - button "E Egypt" [ref=e47] [cursor=pointer]:
          - generic [ref=e48]: E
          - generic [ref=e49]: Egypt
        - button "G Greece" [ref=e50] [cursor=pointer]:
          - generic [ref=e51]: G
          - generic [ref=e52]: Greece
        - button "P Persia" [ref=e53] [cursor=pointer]:
          - generic [ref=e54]: P
          - generic [ref=e55]: Persia
        - button "I India" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: I
          - generic [ref=e58]: India
        - button "C China" [ref=e59] [cursor=pointer]:
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
    - button "Start Game" [ref=e94] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /** Navigate to the app and click Start Game to get past the setup screen */
  4   | async function startGame(page: Page) {
  5   |   await page.goto('/');
  6   |   // Wait for setup screen to render
  7   |   const startButton = page.getByRole('button', { name: /start game/i });
  8   |   await startButton.waitFor({ timeout: 10000 });
  9   |   await startButton.click();
  10  |   // Wait for canvas to appear (game started)
  11  |   await page.waitForSelector('canvas', { timeout: 10000 });
  12  | }
  13  | 
  14  | test.describe('Setup screen', () => {
  15  |   test('shows leader and civ selection before game starts', async ({ page }) => {
  16  |     await page.goto('/');
  17  |     const text = await page.locator('body').innerText();
  18  |     expect(text).toMatch(/leader|civilization|start game/i);
  19  |   });
  20  | });
  21  | 
  22  | test.describe('Game loads and renders', () => {
  23  |   test('canvas renders with hex grid and UI elements', async ({ page }) => {
  24  |     const logs: string[] = [];
  25  |     page.on('console', msg => {
  26  |       if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('Manifest')) {
  27  |         logs.push(`[${msg.type()}] ${msg.text()}`);
  28  |       }
  29  |     });
  30  | 
  31  |     await startGame(page);
  32  | 
  33  |     const canvasCount = await page.locator('canvas').count();
  34  |     expect(canvasCount).toBeGreaterThanOrEqual(1);
> 35  | 
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  36  |     const canvasSize = await page.locator('canvas').first().boundingBox();
  37  |     expect(canvasSize!.width).toBeGreaterThan(100);
  38  |     expect(canvasSize!.height).toBeGreaterThan(100);
  39  | 
  40  |     const body = await page.locator('body').innerText();
  41  |     expect(body).toContain('Turn');
  42  |     expect(body).toContain('End');
  43  | 
  44  |     expect(logs).toEqual([]);
  45  |   });
  46  | 
  47  |   test('minimap renders as second canvas', async ({ page }) => {
  48  |     await startGame(page);
  49  |     const canvasCount = await page.locator('canvas').count();
  50  |     expect(canvasCount).toBe(2);
  51  |   });
  52  | });
  53  | 
  54  | test.describe('Game interactions', () => {
  55  |   test('clicking hex shows terrain or unit info in bottom bar', async ({ page }) => {
  56  |     await startGame(page);
  57  | 
  58  |     const canvas = page.locator('canvas').first();
  59  |     const box = await canvas.boundingBox();
  60  | 
  61  |     await canvas.click({ position: { x: box!.width * 0.8, y: box!.height * 0.2 } });
  62  | 
  63  |     const text = await page.locator('body').innerText();
  64  |     expect(text).toMatch(/Grassland|Plains|Hills|Desert|Tundra|Forest|Ocean|Settler|Warrior|Scout|Builder|Move/);
  65  |   });
  66  | 
  67  |   test('pressing Enter advances turn', async ({ page }) => {
  68  |     await startGame(page);
  69  | 
  70  |     await page.keyboard.press('Enter');
  71  |     await page.waitForTimeout(500);
  72  | 
  73  |     const after = await page.locator('body').innerText();
  74  |     expect(after).toContain('Turn 2');
  75  |   });
  76  | 
  77  |   test('pressing T opens tech tree panel', async ({ page }) => {
  78  |     await startGame(page);
  79  | 
  80  |     await page.keyboard.press('t');
  81  | 
  82  |     const text = await page.locator('body').innerText();
  83  |     expect(text).toContain('Technology Tree');
  84  |     expect(text).toMatch(/Pottery|Writing|Mining/);
  85  |   });
  86  | });
  87  | 
  88  | test.describe('No runtime errors', () => {
  89  |   test('no JS errors during basic gameplay loop', async ({ page }) => {
  90  |     const errors: string[] = [];
  91  |     page.on('console', msg => {
  92  |       if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('Manifest')) {
  93  |         errors.push(msg.text());
  94  |       }
  95  |     });
  96  |     page.on('pageerror', err => errors.push(err.message));
  97  | 
  98  |     await startGame(page);
  99  | 
  100 |     const canvas = page.locator('canvas').first();
  101 |     const box = await canvas.boundingBox();
  102 | 
  103 |     // Click a few hexes
  104 |     await canvas.click({ position: { x: box!.width * 0.4, y: box!.height * 0.5 } });
  105 |     await canvas.click({ position: { x: box!.width * 0.6, y: box!.height * 0.3 } });
  106 | 
  107 |     // Open/close panels
  108 |     await page.keyboard.press('t');
  109 |     await page.keyboard.press('t');
  110 |     await page.keyboard.press('Enter');
  111 |     await page.waitForTimeout(1000);
  112 | 
  113 |     // Dismiss turn transition overlay
  114 |     const overlay = page.locator('.fixed.inset-0.z-50');
  115 |     if (await overlay.count() > 0) {
  116 |       await overlay.click({ timeout: 5000 }).catch(() => {});
  117 |     }
  118 |     await page.waitForTimeout(500);
  119 | 
  120 |     await page.keyboard.press('Enter');
  121 |     await page.waitForTimeout(1000);
  122 | 
  123 |     if (await overlay.count() > 0) {
  124 |       await overlay.click({ timeout: 5000 }).catch(() => {});
  125 |     }
  126 |     await page.waitForTimeout(500);
  127 | 
  128 |     expect(errors).toEqual([]);
  129 |   });
  130 | });
  131 | 
```