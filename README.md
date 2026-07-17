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

- [x] Skeleton repo + CI green on the (empty) engine package
- [ ] **S0** — live camera preview on iPhone (branch `s0-skeleton`)
- [ ] **S1** — face-tracking spike ⚠ go/no-go gate
- [ ] S2–S7 — see [docs/PLAN.md](docs/PLAN.md) §4
