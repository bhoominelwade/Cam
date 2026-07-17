# Cam

An iOS-first camera app that coaches you to better photos — portrait and food scenes in the MVP — with **all intelligence on-device**. No backend, no accounts, zero network calls. Free at launch.

Built by astlin (founder/product) + Claude (engineering).

## The docs are the memory

| Doc | What it holds |
|---|---|
| [docs/ARCH.md](docs/ARCH.md) | Architecture: layers, ADRs 001–008, module contracts, runtime model, build pipeline |
| [docs/PLAN.md](docs/PLAN.md) | Scope decisions, vertical slices S0–S7, risk register, process |
| [memory/](memory/) | Claude's working-memory files for the project (mirrored from the dev machine) |
| [e2e-checklists/](e2e-checklists/) | Per-slice on-device check scripts — "done means evidence" |

## Repo layout (ARCH §3)

```
app/                          # React Native app (Expo prebuild + EAS cloud iOS builds)
packages/composition-engine/  # ★ pure TS intelligence — zero deps, 100% unit-tested
docs/                         # ARCH / PLAN / decision records
e2e-checklists/               # per-slice manual device checks
```

## Working agreements

- Slice branches (`s0-skeleton`, `s1-face-spike`, …); **main stays shippable**; merge only when the slice's check passes.
- Versions pinned, lockfiles committed; new dependencies need a reason and a reputation check (PLAN §6.2).
- No secrets in the repo, ever. The MVP has no network layer at all — CI fails the build if networking imports appear in app code.

## Running the engine tests

```sh
cd packages/composition-engine
npm ci
npm test
```

## Slice status

All slices are **code-complete, unit-tested, and pushed** as a stacked branch chain; each stays unmerged until its on-device check passes (PLAN §6.1). The chain (each contains all previous):

`s0-skeleton` → `s1-face-spike` → `s2-engine-v1` → `s3-capture` → `s4-table-stakes` → `s5-food` → `s6-polish`

| Slice | Code | Device check |
|---|---|---|
| S0 viewfinder | ✅ | ⏳ [checklist](e2e-checklists/s0-skeleton.md) |
| S1 face spike ⚠ go/no-go | ✅ | ⏳ [checklist](e2e-checklists/s1-face-spike.md) |
| S2 engine v1.1 (portrait + angles, 35 tests) | ✅ | ⏳ [checklist](e2e-checklists/s2-engine.md) |
| S3 capture → gallery | ✅ | ⏳ [checklist](e2e-checklists/s3-capture.md) |
| S4 flip/flash/focus/zoom | ✅ | ⏳ [checklist](e2e-checklists/s4-table-stakes.md) |
| S5 food scene + arbitration | ✅ | ⏳ [checklist](e2e-checklists/s5-food.md) |
| S6 polish (liquid glass, haptics) | ✅ | ⏳ [stranger test](e2e-checklists/s6-polish.md) |
| S7 TestFlight | docs ready | gated on S0–S6 + [SECURITY-REVIEW](https://github.com/bhoominelwade/Cam/blob/s6-polish/SECURITY-REVIEW.md) re-check |

**To test everything:** enroll in the Apple Developer Program, then from `app/` on `s6-polish`: `npx eas-cli device:create` → `npx eas-cli build --profile development --platform ios` → walk the checklists in order.
