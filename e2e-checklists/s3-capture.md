# S3 — Capture → gallery · on-device check

**Definition of done (PLAN §4):** tap shutter, photo appears in Apple Photos — saved via add-only permission, correctly oriented, in < 1.5s.

Same build as S1/S2 unless noted (expo-media-library and expo-haptics are native modules — **a fresh EAS build is required once** after this slice lands).

## Checks

- [ ] Tap the shutter → white blink + light haptic tick, immediately.
- [ ] **First capture only:** iOS asks for *add-only* photo permission ("allow Cam to add photos") — it must NOT ask to read your library, and must NOT have asked at app launch.
- [ ] Photo appears in Apple Photos within 1.5s of the tap (time it).
- [ ] The saved photo is correctly oriented (portrait), and the selfie is mirrored the way the preview showed it.
- [ ] The saved photo contains NO overlay elements — no grid, brackets, or score.
- [ ] Deny the photo permission → one calm sentence appears ("To keep your shot…"), no crash; grant in Settings → next capture saves.
- [ ] Ten rapid shutter taps → no crash, no duplicate-save weirdness, capture stays responsive.
- [ ] Airplane mode on → everything above still works identically (zero network by design).

**Result:** pass / fail + save timing → paste into the PR.
