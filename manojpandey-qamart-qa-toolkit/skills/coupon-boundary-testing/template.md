# Boundary matrix

| Code | Subtotal | Who | Expected discount | Expected status | Why this value |
|---|---|---|---|---|---|
| FLAT100 | 499 | asha | none ("needs ₹500 or more") | 422 | threshold − 1 |
| FLAT100 | 500 | asha | 100 | 200 | threshold |
| FLAT100 | 501 | asha | 100 | 200 | threshold + 1 |
| SAVE10 | 1999 | asha | 199 | 200 | cap − 1 on the percentage, rounding down |
| SAVE10 | 2000 | asha | 200 | 200 | cap reached exactly |
| SAVE10 | 2001 | asha | 200 | 200 | beyond the cap |
| WELCOME50 | 1000 | asha | 250 | 200 | first order, beyond the cap (50% would be 500) |
| WELCOME50 | 501 | ravi | none | 422 | returning shopper |

Add or remove rows to match the rule being tested. Every row needs a reason.
