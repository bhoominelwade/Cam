# S0 — Skeleton · on-device check

**Definition of done (PLAN §4):** app opens to a live viewfinder in **< 2 seconds** on the physical iPhone.

## Prerequisites (one-time, astlin)

1. Apple Developer account ($99/yr) — required for EAS ad-hoc provisioning from Windows (ADR-002). This is the week-1 purchase.
2. Expo account (free) + `npx eas login` on the ThinkPad.
3. iPhone registered as an ad-hoc device: `npx eas device:create` (opens a QR/URL flow on the phone).

## Build & install

```sh
cd app
npm ci
npx eas build --profile development --platform ios   # cloud build, ~10–20 min
# install on the iPhone via the QR/URL EAS prints
npx expo start --dev-client                          # then open the dev client on the phone (same Wi-Fi)
```

## Checks

- [ ] Cold-open the installed dev build → live camera preview visible in **< 2s** (time it; two runs).
- [ ] First launch asks for **camera permission only** — no photo-library prompt at launch (ARCH §5).
- [ ] Deny camera permission → designed explanation screen with a working Settings deep-link, **no crash**.
- [ ] Re-grant in Settings → returning to the app shows the viewfinder.
- [ ] Preview looks correctly oriented in portrait; front camera preview is mirrored (as users expect).
- [ ] Edit text in `App.tsx` while `expo start` runs → change hot-reloads on the phone without a rebuild.

**Result:** pass / fail + cold-open timings → paste into the PR before merging `s0-skeleton`.
