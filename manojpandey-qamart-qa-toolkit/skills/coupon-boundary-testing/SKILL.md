---
name: coupon-boundary-testing
description: "Use when designing, writing or reviewing tests for coupon, discount, threshold, cap or rounding rules in QA Mart, such as SAVE10, FLAT100, WELCOME50 or any 'X or more' rule."
---
# Coupon boundary testing

Money rules fail at the edges. Test the edges on purpose.

## Steps
1. Read [rules.md](./rules.md) for the current rules. If the user's story differs, trust the story and note the difference.
2. For each rule list the boundaries: the threshold (n-1, n, n+1), the cap (cap-1, cap, cap+1 on the subtotal that produces it), rounding (a subtotal where the percentage has a fraction), and the eligibility switch (first order versus returning shopper).
3. Fill [template.md](./template.md) with one row per value and a reason for each.
4. Confirm each row against the live API: `POST /api/coupons/validate` with `{ code, subtotal, email }`. Record the status and the discount.
5. Rows where the API disagrees with the rule are application bugs. Report them. Do not change `app/`, and do not change the expected value to match the app.
6. Write the spec in `tests/lab/` with a `for` loop over the matrix, using `tests/fixtures.ts` and `tests/test-data.ts`.

## Output
The filled matrix, the spec path, and a list of rows where the app disagrees with the rule.
