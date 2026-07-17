# S7 — Ship prep · TestFlight

**Definition of done (PLAN §4):** 5–10 real users testing via TestFlight; privacy policy live; zero crash reports in first 48h.

## Preconditions

- [ ] S0–S6 checklists all passed and merged to main (main is shippable).
- [ ] `SECURITY-REVIEW.md` exists, is current, and has **no open high-severity findings** (blocks release — PLAN §6.2).
- [ ] App icon replaced (S6).
- [ ] Privacy policy (docs/PRIVACY.md) hosted at a public URL — simplest: enable GitHub Pages on this repo, or paste into a gist. Needed for App Store Connect.

## Build & submit (from `app/`, on main)

```sh
npx eas build --profile production --platform ios
npx eas submit --platform ios          # uploads the build to App Store Connect
```

Then in App Store Connect:

- [ ] TestFlight → add internal testers (your Apple ID) first; verify install + launch.
- [ ] App Privacy questionnaire: **"Data Not Collected"** for every category — true because the app makes zero network calls (see PRIVACY.md; be accurate, Apple checks).
- [ ] Export compliance: uses only standard OS encryption (HTTPS not even used) → typically "No" to proprietary encryption.
- [ ] External testing group "Beta" → invite the 5–10 recruited testers (PLAN §5: recruit during S3–S4!) → submit for beta review (usually < 24h).

## First 48 hours

- [ ] Check TestFlight crash reports twice daily — target: zero.
- [ ] Collect tester feedback in one place (notes doc in repo: docs/BETA-FEEDBACK.md).
- [ ] Watch for the risk-register signals: are guides helping or nagging? Do scores match taste?

**Result:** tester count, crash count at 48h, top 3 pieces of feedback → docs/BETA-FEEDBACK.md + checkpoint with founder.
