---
name: cam-project
description: "Cam — on-device AI camera coach app; repo location, scope, constraints, and current slice status"
metadata: 
  node_type: memory
  type: project
  originSessionId: 105c3c6b-ac46-45d8-bd32-b5ff51dd5367
---

**Cam** is a real product being built by astlin (founder/product) + Claude (engineering): an iOS-first camera app that coaches composition (portrait + food scenes in MVP) fully on-device — no backend, zero network calls, free at launch.

- Repo: `C:\Users\bhoom\OneDrive\Desktop\Cam` → https://github.com/bhoominelwade/Cam (private, push access via stored git credentials)
- Governing docs live in `docs/` in the repo: ARCH.md v1.0 (architecture + ADRs) and PLAN.md v1.2 (slices S0–S7, risks, process). Docs are the memory — always update them when decisions change.
- Stack (ADRs, expensive to reverse): React Native + Expo prebuild + EAS cloud iOS builds (founder is on **Windows, no Mac**), VisionCamera frame processors + ML Kit, Skia + Reanimated overlays, Zustand (slow plane only), pure-TS `packages/composition-engine` (zero deps, the product's soul).
- Key constraints: $99 Apple Developer account is a **week-1** purchase (EAS ad-hoc provisioning needs it); detection data never enters React state; exactly 3 coordinate spaces with 2 transform utils; no analytics/network SDKs in MVP.
- Slice order: S0 skeleton → S1 face-tracking spike (**go/no-go gate**) → S2 engine v1 → S3 capture → S4 table stakes → S5 food scene → S6 polish → S7 TestFlight. Work on slice branches (`s0-skeleton`), main stays shippable, merge only when the slice's on-device check passes.
- Status (2026-07-17): skeleton + docs + CI on main (engine contract v1, 5 tests green). S0 on branch `s0-skeleton`; S1 (go/no-go spike) on `s1-face-spike` (branched off s0): worklet frame pipeline → `DetectionBridge` shared values → Skia thirds grid + smoothed face box; transforms property-tested (9 tests). EAS project linked: `@sensaisatori/cam`, id `ca0f00bb-49d9-4684-8d84-a2b06ee1b79f`, expo account `sensaisatori`.
- VC5 API notes (post-cutoff, verified from installed .d.ts): VisionCamera 5 is Nitro-based — no Expo config plugin (permissions via app.json infoPlist), frame processing via `useFrameOutput` + `useAsyncRunner` (needs `react-native-vision-camera-worklets`), frames must be `.dispose()`d, don't destructure Nitro hybrid objects. Face detector: `react-native-vision-camera-face-detector@2.0.6` `useFaceDetector().detectFaces(frame)`. TS ~6.0 needs explicit `"types": ["jest"]` in tsconfig.
- **ALL SLICES S0–S7 CODE-COMPLETE (2026-07-17)** as a stacked unmerged branch chain: s0-skeleton → s1-face-spike → s2-engine-v1 → s3-capture → s4-table-stakes → s5-food → s6-polish. Engine 35 tests (portrait w/ head angles, food, arbitration contract, fuzz); app 24 tests (transforms, arbitration). Food detection = VC5 built-in salient-object (Apple Vision) since the community ML Kit labeler is VC4-only; custom Nitro plugin stays the budgeted fallback. Security: fresh-context review in SECURITY-REVIEW.md (0 High; 3 Mediums fixed same-day: temp-file cleanup, add-only manifest truth, hardened CI gate + gitleaks). PRIVACY.md + s0–s7 checklists written. Liquid-glass UI per [[cam-design-taste]].
- Blocked on astlin: Apple Developer Program enrollment ($99) — device:create failed "no team associated". After enrollment, from `app/` on `s6-polish`: `npx eas-cli device:create` → `npx eas-cli build --profile development --platform ios`, then walk e2e-checklists s0→s6 in order, tune knobs in `app/src/detection/constants.ts` (CAMERA_TUNING, ANGLE_SIGN, SALIENT_Y_FLIP), merge branches in order as checks pass. PowerShell gotcha: commit messages with double quotes → use `git commit -F <file>`. Interactive preview artifact: https://claude.ai/code/artifact/f3d8d2e6-d9a3-4354-8fbc-1471a0885eba

Related: [[astlin-founder]]
