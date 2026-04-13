# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\game.spec.ts >> Game interactions >> pressing Enter advances turn
- Location: packages\web\e2e\game.spec.ts:67:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /** Navigate to the app and click Start Game to get past the setup screen */
  4   | async function startGame(page: Page) {
> 5   |   await page.goto('/');
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  35  | 
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
```