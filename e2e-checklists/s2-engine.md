# S2 — Composition engine v1 · on-device check

**Definition of done (PLAN §4):** live score + one nudge arrow coaching your selfie; green "nice" moment. Unit tests pass on all portrait rules; nudges point the right way on the mirrored front camera.

Runs on the same build as S1 (no native changes — JS hot-reloads).

## Checks

- [ ] Score badge (bottom center) reacts live as you move: rises as your face approaches an upper-thirds intersection, falls as you drift to center or edge.
- [ ] Face at a thirds intersection at comfortable size → score ≥ 90s, badge turns green with "nice", white target zone fades out.
- [ ] **The mirroring check (the S2 gate):** stand with your face on the LEFT of the preview → the arrow points RIGHT (toward the nearest intersection), and moving the way the arrow points actually raises the score. Repeat from the right side, top, and bottom.
- [ ] Arrow never flaps between two directions when you sit near a boundary (300ms dwell should make switches feel deliberate).
- [ ] At most ONE arrow ever shows; "come closer"/"step back" appears as text under the score, never as a second arrow.
- [ ] Very small (far) face → "come closer"; face filling the frame → "step back".
- [ ] Face lost → badge and guides disappear cleanly; face back → coaching resumes within ~a second.
- [ ] Everything from the S1 checklist still holds (smoothness, HUD 10–15/s, no thermal collapse).

**Result:** pass / fail + which constants (if any) needed tuning → paste into the PR.
