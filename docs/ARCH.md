# Cam — Architecture Specification (ARCH.md)

*The HOW: every consequential technical decision, recorded with its alternatives and reasoning, plus the system's structure, runtime model, and build pipeline.*

Version 1.0 · 2026-07-17 · Companion to Spec v0.2 and Plan v1.2
Constraints inherited: iOS-first launch · Portrait + Food MVP · founder dev machine is **Windows (no Mac)** · free at launch · on-device only · budget-minimal

---

## 1. Architecture at a glance

Cam is a **single mobile app with no backend**. Five layers, strict downward dependencies, one hard rule: *the intelligence (composition engine) is pure logic that knows nothing about cameras, React, or phones.*

```
┌────────────────────────────────────────────────────────┐
│  UI Layer          screens, controls, score badge       │  React Native + TS
├────────────────────────────────────────────────────────┤
│  Overlay Layer     grid / target zone / nudges drawing  │  Skia + Reanimated
├────────────────────────────────────────────────────────┤
│  Composition Engine  scene rules · scoring · nudges     │  Pure TypeScript ★
├────────────────────────────────────────────────────────┤
│  Detection Layer   face / object ML on camera frames    │  VisionCamera frame
│                                                          │  processors + ML Kit
├────────────────────────────────────────────────────────┤
│  Platform Layer    camera, capture, gallery, haptics,   │  Native modules via
│                    permissions                           │  RN libraries
└────────────────────────────────────────────────────────┘
```

★ = the soul of the product. Zero dependencies, 100% unit-testable, portable to any framework.

---

## 2. Architecture Decision Records

Each ADR: what we chose, what we rejected, why, and what it costs us. These are the decisions that are expensive to reverse — everything else is just code.

### ADR-001 · Framework: React Native + VisionCamera
**Chosen:** React Native (latest stable), `react-native-vision-camera` for the camera pipeline.
**Rejected:** *Flutter* — equally capable ML story (`google_mlkit_*` is mature), but RN's VisionCamera frame processors are the best-documented path for per-frame ML with native-thread performance, and the JS/TS ecosystem gives us the widest plugin choice. *Native Swift* — best raw capability, but kills the Android fast-follow and doubles future work. *Web/PWA* — camera + ML performance and gallery integration are not competitive.
**Consequences:** We accept RN's dependency-churn risk (mitigated: pinned versions, lockfile, deliberate upgrades). Flutter remains the recorded Plan B; the composition engine ports intact by design.

### ADR-002 · Build system: Expo (prebuild) + custom dev client + EAS cloud builds
**Chosen:** Expo tooling on top of RN — `expo prebuild` manages the native projects, a **custom dev client** carries our native modules (VisionCamera, ML Kit, Skia), and **EAS Build** compiles iOS **in the cloud**.
**Rejected:** *Bare RN with local builds* — impossible for iOS on a Windows machine (Xcode requires macOS). *Expo Go* — cannot load our native camera/ML modules at all. *Renting/borrowing a Mac or a Mac-in-cloud (MacStadium etc.)* — more cost and friction than EAS for our build volume.
**Why:** This is the *only* first-class iOS path from Windows, and it happens to also be the modern RN default: reproducible native projects, cloud signing, one-command builds, painless TestFlight submission (`eas submit`).
**Consequences:** **(1)** Installing builds on a physical iPhone via EAS requires Apple **ad-hoc provisioning, which requires the paid $99 Apple Developer account — so that purchase moves from week 3–4 to week 1.** (Free provisioning only works through local Xcode, i.e. a Mac.) **(2)** We depend on EAS's free build tier; at 1–2 sessions/week it should suffice, and overflow builds cost little. **(3)** Build feedback loops are minutes, not seconds — we mitigate by doing most iteration in the JS layer (hot-reloads instantly through the dev client without rebuilding).

### ADR-003 · Language: TypeScript, strict mode, everywhere
**Rejected:** plain JS. Non-decision in 2026 — the composition engine especially is exactly the kind of geometric logic where the compiler catches real bugs. No `any` in the engine layer.

### ADR-004 · ML: Google ML Kit via frame-processor plugins, per-detector strategy
**Chosen:** on-device ML Kit models, accessed as VisionCamera frame processors. Per detector: **faces** → `react-native-vision-camera-face-detector` (mature, proven); **food/objects** → ML Kit object detection + image labeling via community plugin *if it proves solid in S5, else a small custom native plugin* wrapping ML Kit directly (Kotlin + Swift, a documented pattern, already budgeted).
**Rejected:** *TensorFlow Lite / ONNX custom models* — maximum control, but we'd be training/sourcing models for problems ML Kit already solves free and fast. Revisit only if ML Kit's food detection quality disappoints. *Apple Vision framework* — excellent but iOS-only; would fork the detection layer per platform and complicate the Android fast-follow.
**Consequences:** We accept ML Kit's model quality as our ceiling for MVP. The Detection Layer exposes detector-agnostic output types, so swapping a detector implementation never touches the engine.

### ADR-005 · Overlay rendering: react-native-skia + Reanimated
**Chosen:** `@shopify/react-native-skia` draws all guides on the GPU; `react-native-reanimated` shared values carry detection results from the frame-processor thread to the UI without crossing the React render cycle.
**Rejected:** *React views/SVG for overlays* — re-rendering React components at detection frequency guarantees jank; this is the classic mistake in this app category.
**Consequences:** Overlay code is written in Skia's drawing model (a specialized skill, but contained in one layer). Smoothness targets from Spec §9.1 become achievable rather than hopeful.

### ADR-006 · State management: Zustand for app state; **detection data never enters React state**
**Chosen:** two-tier state. *App state* (current mode, flash setting, permission status, capture status) → Zustand, tiny and boilerplate-free. *Hot-path data* (detections at 10–15/sec, score, guide geometry) → Reanimated shared values only, consumed directly by the Skia overlay.
**Rejected:** *Redux* — ceremony without benefit at this app's size. *Everything in React state* — 15 re-renders/sec of the camera screen; instant jank.
**Consequences:** Two data planes to reason about, clearly documented: **slow plane = React, fast plane = worklets/shared values.** The boundary is one module (`DetectionBridge`).

### ADR-007 · The Composition Engine is a pure, isolated TypeScript package
**Chosen:** `packages/composition-engine` — no imports from RN, camera, or UI. Input: normalized detections (coordinates in 0–1 frame space) + frame metadata. Output: guide geometry + score + at most two nudges. Scene rules are **pluggable modules** (`portrait.ts`, `food.ts`, later `pose.ts`) behind one interface.
**Why:** it's the product's soul (testable to 100%), it's the portability guarantee (ADR-001's Plan B), and pluggable rules are what make v1.1+ scene types cheap.
**Consequences:** A thin adapter normalizes each detector's raw output into engine types; the engine never sees ML Kit's shapes.

### ADR-008 · No backend, no accounts, no analytics SDKs in MVP
**Chosen:** the app ships with **zero network calls**.
**Rejected:** *crash reporting/analytics from day one* — each SDK is a privacy statement complication, a supply-chain surface, and a data pipe out of an app whose whole pitch is "nothing leaves your phone." For beta, TestFlight's built-in crash reports + tester feedback suffice.
**Consequences:** Less telemetry than a typical startup MVP — a deliberate trade of data for trust. Revisit post-beta, deliberately, and never for image data.

---

## 3. Module structure & contracts

Monorepo layout (one git repo):

```
cam/
├─ app/                        # the React Native app
│  ├─ src/
│  │  ├─ screens/              # CameraScreen (MVP has ~1 real screen)
│  │  ├─ overlay/              # Skia drawing: Grid, TargetZone, NudgeArrow, ScoreBadge
│  │  ├─ detection/            # frame processors, DetectionBridge, adapters → engine types
│  │  ├─ capture/              # shutter, photo capture, save-to-gallery
│  │  ├─ platform/             # permissions, haptics, device info
│  │  └─ state/                # Zustand store (slow plane only)
├─ packages/
│  └─ composition-engine/      # ★ pure TS: types, rules/, scoring, nudges + full unit tests
├─ docs/                       # SPEC / ARCH / PLAN mirrors, ADR updates, review reports
└─ e2e-checklists/             # per-slice manual device check scripts
```

**The one contract that matters** (sketch, not code): the engine consumes `SceneInput { sceneType, subjects[], horizon?, frameAspect }` with all geometry normalized 0–1, and returns `Guidance { guides[], score, nudges[≤2], celebrate }`. Detection adapters produce `SceneInput`; the overlay renders `Guidance`. Neither side knows the other exists. That interface is versioned and unit-tested — it is the load-bearing wall of the codebase.

**Scene-type arbitration** (Spec §6) lives in the detection layer as a small state machine with hysteresis: enter *portrait* when a face > ~8% of frame area persists ~300ms; enter *food* when object/label detection says food-like and no dominant face; fall back to *generic* otherwise. Thresholds are constants in one file, tuned on-device in S5.

---

## 4. Runtime model (threads and frequencies)

Three execution contexts, three frequencies — mixing them up is how camera apps die:

| Context | Runs | Frequency |
|---|---|---|
| **Frame-processor thread** (native/worklet) | ML detection on camera frames, via `runAsync` + `runAtTargetFps` | 10–15/sec, dropped under thermal pressure |
| **UI thread** (Skia/Reanimated) | Overlay drawing, interpolation/smoothing of guide positions, score animation | Screen refresh rate (60–120fps) |
| **JS thread** (React) | Controls, mode changes, capture flow, permission flows | Event-driven only |

Flow per frame: camera frame → frame processor runs detector → adapter normalizes to engine types → engine computes guidance (pure, fast, runs inside the worklet context) → results written to shared values → Skia overlay interpolates toward new geometry on the UI thread. React is not involved between shutter presses. Smoothing (low-pass on positions, hysteresis on nudge switching, ~300ms minimum nudge dwell time) prevents jitter and cue-flapping.

**Coordinate discipline (the §8.4 gotcha, made concrete):** exactly three coordinate spaces exist — *sensor frame* (raw, sensor-oriented), *engine space* (normalized 0–1, orientation-corrected, mirror-corrected), *screen space* (pixels, after preview crop/scale). Two tested transform utilities (`frameToEngine`, `engineToScreen`) are written in S1 and are the **only** place coordinates convert. Front-camera mirroring is handled in `frameToEngine` so the engine and all rules are mirror-agnostic by construction.

---

## 5. Cross-cutting concerns

**Permissions & degraded states.** First launch asks for camera only (with honest copy); add-only photo permission is requested at *first capture*, not at launch — ask at the moment of obvious need. Every denial state has a designed screen (why we need it + a settings deep-link). No permission, no crash, ever.

**Error handling.** Detector failure or model unavailability degrades gracefully: the camera keeps working with a plain thirds grid (Cam without AI is still a nice camera). Capture errors surface one human sentence, never a stack trace. The engine is pure and cannot throw on valid input — guaranteed by its test suite.

**Performance budget (from Spec §9.1, enforced not hoped):** cold open → viewfinder < 2s · detection cadence 10–15/sec sustained · overlay visually continuous · shutter → gallery < 1.5s. A debug HUD (dev builds only) shows live detection fps + frame time so every session sees the numbers.

**Security (Plan §6.2 applied to code):** no network layer exists in MVP app code — a CI grep gate fails the build if networking imports appear; dependencies pinned + `npm audit` gate on every PR; no image data ever serialized to disk, logs, or third parties; permissions minimal (camera + add-only photos).

---

## 6. Testing strategy (per layer)

| Layer | How it's tested | Gate |
|---|---|---|
| Composition engine | Exhaustive unit tests (Jest): every rule, scoring edge cases, nudge selection, golden-case fixtures ("face at exact thirds intersection scores ≥95") | 100% of rules covered; runs on every commit |
| Detection adapters + transforms | Unit tests with recorded detector-output fixtures; coordinate transforms property-tested (round-trip, mirror, rotation) | Every commit |
| Overlay | Snapshot tests where cheap; primarily the per-slice on-device checklist (smoothness is judged by eyes + the debug HUD numbers) | Slice gate |
| Full app | `e2e-checklists/` scripted manual runs on the real iPhone per slice; TestFlight beta = the real e2e | Slice gate / S7 |
| Security | Fresh-context independent review vs OWASP Mobile Top 10 → `SECURITY-REVIEW.md` | Blocks S7 |

CI (GitHub Actions, free tier): typecheck + lint + unit tests + audit on every PR. EAS builds triggered manually per session (build minutes are the scarce resource, not CI minutes).

---

## 7. Build & release pipeline (Windows-only founder)

1. **Develop:** VS Code on the ThinkPad. JS/TS changes hot-reload instantly into the dev client on the iPhone over Wi-Fi — no rebuild. Native-module changes (rare after S1) → new EAS cloud build.
2. **Build:** `eas build --platform ios` → cloud macOS workers compile + sign. Dev-client builds install on your registered iPhone via ad-hoc provisioning (URL/QR).
3. **Distribute:** beta via `eas submit` → TestFlight. Testers install the normal way; crash reports come back through TestFlight.
4. **Prerequisite consequence (flagged):** the **$99 Apple Developer account is now a week-1 purchase** — it is what makes steps 2–3 possible from a Windows machine. This supersedes Plan §3's week-3–4 timing; Plan updated in the same commit as this document.

---

## 8. What this architecture deliberately does NOT have

No backend/servers · no user accounts · no database (the OS photo library is the only persistence) · no analytics SDKs (MVP) · no photo editing pipeline · no cloud ML · no third-party auth/ads/tracking. Every absence is load-bearing: each one is cost avoided, attack surface removed, and privacy promise kept.

---

*Handoff: this ARCH.md + Spec v0.2 + Plan v1.2 are sufficient for implementation to begin at S0 with no open technical decisions. First code artifact: the repo skeleton matching §3, with CI green on an empty engine package.*
