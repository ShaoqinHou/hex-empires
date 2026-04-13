# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-and-map.spec.ts >> Map Integrity: Unit Positions >> no units on water tiles (land units only)
- Location: e2e\ai-and-map.spec.ts:195:3

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of null (reading 'units')
    at eval (eval at evaluate (:302:30), <anonymous>:4:31)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```