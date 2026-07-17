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
- Status (2026-07-17): repo skeleton + docs + CI pushed to main; S0 app scaffold in progress on branch `s0-skeleton`. On-device checks require astlin to set up EAS login + Apple Developer account.

Related: [[astlin-founder]]
