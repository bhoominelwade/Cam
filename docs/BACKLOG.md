# Backlog

New ideas land here, not in the sprint (PLAN Â§5, scope-creep rule). Revisit after beta.

## Post-MVP candidates

### ~~Head-angle & tilt rules~~ — DONE 2026-07-17 (engine v1.1, branch s2-engine-v1)
ML Kit already returns `pitchAngle` / `rollAngle` / `yawAngle` per face â€” unused today.
Add portrait sub-rules: penalize heavy roll, prefer slight three-quarter yaw over dead-on,
device-gyro horizon leveling. Pure rules, explainable, no new dependencies.
**Trigger:** after S5, if sessions allow â€” or fold into v1.1 pose work.

### Data-informed composition scoring ("train it on great photos")
Founder question (2026-07-17): can we train on Pinterest data?
- **Not Pinterest scrapes** â€” ToS violation + copyrighted images; unacceptable legal
  exposure for a commercial, privacy-first app.
- **Legal routes:** AVA (~250k aesthetically-rated photos), CPC (comparative composition
  preferences), licensed pools (e.g. Unsplash dataset).
- **Preferred shape v1:** offline analysis of such datasets to *tune the existing rule
  constants* (thirds offsets, ideal face-height band, weights) â€” data-informed rules,
  zero runtime cost, explainability kept.
- **Bigger swing v2:** small on-device aesthetic model (NIMA-style, Core ML/TFLite, few MB)
  as an additional detector feeding the engine â€” engine contract already supports new
  input sources without touching rules (ADR-007).
- **Trigger to act:** beta testers report scores don't match taste. If they don't, rules won.

### v1.1 (already planned)
Full-body pose coaching â€” needs the custom native ML Kit pose plugin (budgeted, spec Â§8.1).

### v1.2 (already planned)
Android bring-up â€” needs mid-range device + Play account ($25).

