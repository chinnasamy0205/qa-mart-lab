---
name: coupon-boundary-testing
description: Design boundary tests for QA Mart coupons (minimum subtotal, caps, expiry, reuse). Use when writing or reviewing coupon tests.
---

# Coupon boundary testing

1. Read coupon rules from `app/server.js` or `docs/api/openapi.yaml` (read only).
2. For each coupon test: just below, exactly at, and just above the minimum subtotal.
3. Check the discount cap, case-insensitive codes, and unknown codes.
4. Check single-use coupons (e.g. WELCOME50) cannot be reused by the same email.
5. Assert the exact discounted total in rupees.
6. Prefer the `qamart_validate_coupon` MCP tool to confirm real behaviour before writing assertions.
