# S5 — Food scene · on-device check

**Definition of done (PLAN §4):** point at a plate → app switches to food mode and coaches the shot. Scene switching is sticky (no flicker panning across a table); food rules unit-tested ✓; feels as good as portrait mode.

**Detection note:** the food subject comes from VC5's built-in salient-object detection (Apple Vision) — a "dominant subject" box, not a food classifier. If it proves too loose in practice, the budgeted fallback is a small custom ML Kit image-labeling plugin (PLAN §5 risk row 3); the engine seam (`kind: 'food'` subjects) already supports it.

## Checks

- [ ] Back camera at a plate of food, no face in frame → mode label slides to **FOOD** within ~a second; HUD shows `food`.
- [ ] Salient box geometry: brackets sit ON the dish. If vertically flipped → set `SALIENT_Y_FLIP` false in `constants.ts`; if the box is pixel-sized garbage, report values (coordinate convention knob).
- [ ] **Stickiness (the S5 gate):** pan slowly across the table between two plates → mode stays FOOD, no flicker to generic; brief dropouts don't blink the guides.
- [ ] Someone leans into frame → with a *dominant* (close) face, mode flips to PORTRAIT after ~300ms; small background faces do NOT steal the scene from the plate.
- [ ] Food coaching feels right: distant plate → "move closer"; dish off in a corner → arrow toward center/thirds; skewed phone → "level the phone" (needs gyro wiring? if the level cue never fires, horizon isn't plumbed — known gap, engine supports it).
- [ ] Centered, generous, level dish → high score + green "nice" — hand the phone to a stranger with a plate: do they take a better shot?
- [ ] Capture in food mode saves correctly.

**Result:** pass / fail + SALIENT knob values + taste verdict (founder call) → paste into the PR.
