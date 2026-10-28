---
description: Generate a Playwright spec from a QA Mart user story
agent: agent
---

Read the story in ${input:story:path such as docs/stories/US-101-coupon-story.md}.

1. List acceptance criteria and boundary cases.
2. Write `tests/<story-id>.spec.ts` following the QA Mart testing instructions.
3. Run `npx playwright test <file>` and report pass/fail per test.
   Do not modify `app/`.
