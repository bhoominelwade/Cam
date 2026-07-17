# S1 — Face-tracking spike · on-device check ⚠ GO/NO-GO GATE

**Definition of done (PLAN §4):** a box + thirds grid smoothly tracking your face in real time. No visible jitter/lag while panning; stable 10–15 detections/sec on the debug HUD.

**The gate:** if this doesn't feel great after 4 sessions of tuning, we stop and change approach (PLAN §4) — that decision is the whole reason S1 runs first.

## Build & run

```sh
cd app
npm ci
npx eas build --profile development --platform ios    # native modules changed since S0 → new build required
npx expo start --dev-client
```

## Checks

- [ ] Debug HUD (top-right) reads a stable **10–15 det/s** while a face is in frame; it doesn't collapse after 2–3 minutes of continuous use (thermal check).
- [ ] Green box locks onto your face and tracks while you pan the phone slowly and quickly — motion looks **smooth and continuous**, not teleporting or rubber-banding.
- [ ] Box geometry is correct: it sits ON your face — not flipped left/right, not rotated 90°, not offset.
  - If it's mirrored → flip `FRONT_PREVIEW_MIRRORED` in `app/src/detection/constants.ts` (hot-reloads).
  - If it's rotated/swapped → try `FRAME_ROTATION_PORTRAIT` = 270 (or 0).
- [ ] Box follows when you move closer/farther (scales with face size).
- [ ] Face leaves frame → box disappears within ~a third of a second, no lingering ghost box; face returns → re-acquires within ~a second.
- [ ] Two people in frame → box stays on the larger (closer) face without flickering between them.
- [ ] Thirds grid stays fixed and crisp while everything else animates.
- [ ] 3+ minutes of continuous tracking: no crash, no freeze, phone warm at most (not hot), preview never stutters.

**Result:** GO / NO-GO + HUD numbers + which constants needed flipping → paste into the PR.
