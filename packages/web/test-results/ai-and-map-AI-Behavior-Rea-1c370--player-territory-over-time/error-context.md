# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-and-map.spec.ts >> AI Behavior: Reactions >> AI moves units toward player territory over time
- Location: e2e\ai-and-map.spec.ts:395:3

# Error details

```
Error: page.evaluate: TypeError: window.__gameDispatch is not a function
    at eval (eval at evaluate (:302:30), <anonymous>:1:13)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```