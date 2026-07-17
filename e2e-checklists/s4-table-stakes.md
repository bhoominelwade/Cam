# S4 — Camera table stakes · on-device check

**Definition of done (PLAN §4):** flip camera, flash, tap-to-focus — and guides stay correct after every flip (the mirroring check).

## Checks

- [ ] **The flip check (the S4 gate):** flip to the back camera, point at someone. Brackets sit ON the face, arrow points the RIGHT way (back camera is not mirrored — if the arrow points backwards only on one camera, tune `CAMERA_TUNING` in `constants.ts`; each camera has its own rotation/mirror knobs, hot-reloads).
- [ ] Flip back and forth 10× fast: no crash, no frozen preview, no stale bracket from the other camera flashing in.
- [ ] Tilt cue direction is correct on BOTH cameras (mirror flips roll — verify "tilt head left" actually means your left in the preview each time).
- [ ] Flash chip cycles off → on → auto; capture with flash on (back camera) fires the flash; front-camera capture doesn't crash with flash set.
- [ ] Tap anywhere on the preview → focus/exposure adjusts to that point.
- [ ] Pinch → smooth native zoom; guides stay glued to the face while zoomed.
- [ ] Capture still saves correctly from BOTH cameras, correctly oriented.

**Result:** pass / fail + which CAMERA_TUNING values were needed → paste into the PR.
