# S6 — Polish · on-device check

**Definition of done (PLAN §4):** the version you'd proudly demo — passes the hand-it-to-a-stranger test on both a selfie *and* a plate of food.

## Checks

- [ ] **The stranger test (the S6 gate):** hand the phone to someone who's never seen Cam, say "take a selfie." They should understand the coaching without explanation and end on a green "nice." Repeat with a plate of food. Watch their face — delight or confusion?
- [ ] Haptic tick fires exactly once each time you cross into the green moment — not repeatedly while staying green.
- [ ] Glass surfaces read as iOS-native: score capsule, hint chips, flash chip, flip button all blur what's behind them.
- [ ] Nothing ever overlaps: score capsule, hint chip, error chip, chrome, and HUD keep clear of each other with a face tracked and cues active.
- [ ] Motion audit: no element ever teleports — brackets glide, capsule fades, mode label changes feel deliberate.
- [ ] App icon: still the Expo default — **replace before TestFlight** (assets/icon.png, 1024×1024; founder taste call).
- [ ] 10-minute continuous session: warm at most, no stutter creep, battery drain unremarkable.

**Result:** stranger verdicts (selfie + food) + icon decision → paste into the PR.
