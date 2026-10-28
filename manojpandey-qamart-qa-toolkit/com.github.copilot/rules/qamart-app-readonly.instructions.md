---
description: QA Mart application source is read-only during test work.
applyTo: app/**
---

# QA Mart app boundary

- Treat `app/` as read-only. Diagnose behavior through stories, API contracts, and tests; do not edit application source to make a test pass.
- If a correct test disagrees with the app, retain the assertion and report the story acceptance criterion, observed result, and evidence.
- Make test and documentation changes only in their appropriate folders.