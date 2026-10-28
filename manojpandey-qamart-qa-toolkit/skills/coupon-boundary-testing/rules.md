# Coupon rules (US-101)

| Code | Threshold | Discount | Cap | Rounding | Who |
|---|---|---|---|---|---|
| SAVE10 | none | 10% of subtotal | ₹200 | down to the rupee | everyone |
| FLAT100 | subtotal ≥ ₹500 | ₹100 | none | n/a | everyone |
| WELCOME50 | none | 50% of subtotal | ₹250 | down to the rupee | first order only |
| SUMMER25 | n/a | none | n/a | n/a | expired for everyone |

Other behavior: codes ignore case and surrounding spaces. An unknown code returns "Invalid coupon code". An empty code returns "Enter a coupon code".

Cap hit points: SAVE10 reaches the cap at subtotal 2000 (10% = 200). WELCOME50 reaches it at 500.
