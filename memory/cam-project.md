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
- Blocked on astlin (Apple ID sign-ins are theirs alone): `npx eas-cli device:create` then `npx eas-cli build --profile development --platform ios` in `app/` on branch `s1-face-spike`; then run e2e-checklists s0 + s1 on the iPhone, tune rotation/mirror constants in `app/src/detection/constants.ts`, and merge slices in order once checks pass.

Related: [[astlin-founder]]
