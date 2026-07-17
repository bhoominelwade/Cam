# Cam — Project Plan (PLAN.md)

*Scope, slices, estimates, risks, and process — derived from the founder grill on 2026-07-17.*

Version 1.2 · Companion to Spec v0.2 · Team: astlin (founder/product) + Claude (engineering)

> **v1.1 update (founder decisions):** MVP scope is **Portrait + Food** (pose moves to v1.1 post-launch). App launches **free** — the on-device architecture costs ~nothing per user, so free is sustainable and growth runs on product love. Timeline: **5–8 weeks to TestFlight beta.**

---

## 1. The constraints (what scoping is built from)

From the grill: Cam is a **real product/business**, wanted in testers' hands **fast (~4–8 weeks)**, built by **you + me**, and the only hardware currently available is **an iPhone** — no Apple Developer account yet, no Play account, no Android device.

An estimate that ignores these is fiction. These four facts drive every decision below.

## 2. The two scope decisions the constraints force

**Decision 1 — MVP is iOS-first.** We cannot validate "feels smooth on mid-range Android" without an Android phone, and shipping unvalidated is how a camera app gets 2-star reviews. So: we keep the **React Native codebase** (the Android option stays alive at near-zero extra cost), but the MVP *launches* on iOS only. Android becomes a fast-follow the week you have a ~₹15–20k Android device and a Play account ($25) in hand — the code will already mostly run there; the work is validation and tuning, not a rebuild.

**Decision 2 — MVP is two hero scene types: portrait/selfie + food.** (Revised from portrait-only after founder review.) Food photography is part of Cam's identity — the creator audience the founder wants is exactly the audience food guidance wins — so it ships in the first version people touch, at the honest cost of ~2–4 extra sessions. **Full-body pose moves to v1.1** — it carries the most technical risk (likely needs a small custom native ML plugin) and shouldn't load the first release. The composition engine takes new scene types as pluggable rule sets, so pose lands later without touching core code.

Everything in spec v0.2 still stands; this plan sequences it under real constraints.

## 3. Money (small, but real)

- **Now: ₹0.** Apple's free provisioning lets us install dev builds on your iPhone (they re-sign every 7 days — mildly annoying, free).
- **~Week 3–4: Apple Developer account, $99/yr.** Needed for TestFlight beta. This is the only purchase the MVP requires.
- **When Android starts (post-MVP): ~$25** Play account **+ a mid-range Android phone** (buy mid-range deliberately — if Cam is smooth there, it's smooth everywhere).

## 4. The build: vertical slices in dependency order

Each slice is end-to-end and demo-able — you'll *see* progress, not take my word for it. Estimates are in working sessions (a focused block of you + me), given as ranges because honest estimates have ranges. **Every slice ends with a runnable check** — done means evidence, not "looks done."

| # | Slice | What you'll see | Check (definition of done) | Est. |
|---|-------|-----------------|---------------------------|------|
| S0 | Skeleton | Live camera preview in our app on your iPhone | App opens to viewfinder < 2s on device | 1–2 |
| S1 | **⚠ The spike** | A box + thirds grid smoothly tracking your face in real time | No visible jitter/lag while panning; stable 10–15 detections/sec | 2–4 |
| S2 | Composition engine v1 | Live score + one nudge arrow coaching your selfie; green "nice" moment | Unit tests pass on all portrait rules; nudges point the right way on the mirrored front camera | 2–3 |
| S3 | Capture → gallery | Tap shutter, photo appears in Apple Photos | Saved via add-only permission, correctly oriented, < 1.5s | 1–2 |
| S4 | Camera table stakes | Flip camera, flash, tap-to-focus | Guides stay correct after every flip (mirroring check) | 1–2 |
| S5 | **Food scene** | Point at a plate → app switches to food mode and coaches the shot (thirds/centered placement, fill-the-frame, tilt cue) | Scene switching is sticky (no flicker panning across a table); food rules unit-tested; feels as good as portrait mode | 2–4 |
| S6 | Polish | The version you'd proudly demo — design, motion, haptic tick, app icon | Passes the hand-it-to-a-stranger test from spec §9.1 — tested on both a selfie *and* a plate of food | 2–4 |
| S7 | Ship prep | TestFlight build on testers' phones | 5–10 real users testing; privacy policy live; zero crash reports in first 48h | 1–2 |

**Total: 12–23 sessions.** At a comfortable 3 sessions/week that's **5–8 weeks to TestFlight beta**, with the spread being honest uncertainty, most of it concentrated in S1, S5 and S6.

**The gate that matters:** S1 is the go/no-go. If real-time tracking doesn't feel great on your iPhone after 4 sessions, we stop and change approach (native iOS spike, or different detection strategy) *before* any money or polish is spent. Buying that information first is the whole point of doing it first. After S1, we re-estimate everything — the first slice teaches us our real velocity.

Post-MVP backlog, in order: **v1.1 full-body pose** (budget includes the small custom native ML Kit plugin from spec §8.1), **v1.2 Android bring-up** (needs the device + Play account), then the fast-follow list from spec §5. Monetization decisions wait until people demonstrably love the free product.

## 5. Risk register (owned, triggered, mitigated)

| Risk | Likelihood | Impact | Trigger to act | Mitigation | Owner |
|------|-----------|--------|---------------|------------|-------|
| Real-time overlay not smooth enough | Med | **Fatal** | S1 gate fails | Spike first; fallbacks: lower detection rate + heavier interpolation → native iOS module for hot path | Claude |
| RN/ML plugin version conflicts | Med | Med (days lost) | Build breaks in S0–S1 | Pin exact versions; commit lockfile; upgrade only deliberately | Claude |
| Food/object detection plugin less mature than face | Med | Med (S5 overruns) | S5 exceeds 4 sessions | Fall back to a small custom native ML Kit object-detection plugin (well-trodden path, already budgeted in the S5 range) | Claude |
| Guides feel naggy/annoying rather than helpful | Med | High (product fails quietly) | Beta testers ignore or disable guides | Max 1–2 cues on screen (specced); S5 tests with strangers, not just us | Both |
| 7-day free-provisioning expiry stalls testing | High | Low | Weekly | Accept until week 3–4, then $99 account removes it | astlin |
| App Store review rejection (camera/privacy copy) | Low-Med | Med (1–2 wk delay) | First submission | Add-only permission + clear copy written in S3, not at submission; privacy policy ready before S6 | Claude |
| Beta testers not lined up | Med | Med (no learning) | Start of S5 | Recruit 5–10 friends during S3–S4, before the build is ready | astlin |
| Scope creep ("just add pets") | High | High (blows the timeline) | Any new feature idea | New ideas go to the backlog doc, not the sprint; revisit after beta | Both |

## 6. How we work (process, kept lean for a team of two)

**Cadence.** Work happens in sessions; each ends with something demo-able or an explicit blocker note. At each slice boundary we do a 10-minute checkpoint: demo → re-estimate remaining slices → surface decisions needed from you.

**Documents are the memory.** Spec, this plan, and decision records live in the Cam project and stay current — any future session (or future human developer) onboards from the docs, never from chat history. When we change a decision, we update the doc and note why.

**Quality guarantees.** (1) Every slice has its check in the table above — I show you the evidence, not just the claim. (2) The composition engine is pure logic with unit tests from day one — it's the soul of the product and the most testable part. (3) Before TestFlight, I run independent fresh-context reviews (QA pass against the spec, security/privacy pass against §7) — reviewer is never the author, even when both are me.

**Your job vs mine.** Mine: everything technical, the docs, the reviews. Yours: the ~5 decisions only a founder can make — approve scope cuts (this doc is the first), taste calls in S5, buy the Apple account at week 3–4, recruit beta testers, and say "ship."

### 6.1 Source control (git from the first commit)

Yes — the project lives in git from S0, before any real code exists. Not optional for a real product:

- **Private GitHub repository** as the remote. Every slice lands as a reviewed commit/PR with a descriptive message — the git history becomes the project's memory alongside the docs, and the handoff if a human developer ever joins.
- **`main` stays shippable.** Work happens on slice branches (`s1-face-spike`), merges only when the slice's check passes. Version tags at each milestone (`v0.1-spike`, `v0.9-beta`).
- **Lockfile committed, versions pinned** — same discipline that protects us from dependency breakage also protects supply-chain security (below).
- **No secrets in the repo, ever.** MVP has almost none by design (no backend = no API keys); signing credentials stay in Apple's/local keychain, never in git. A `.gitignore` + a secret-scanning check from day one so this stays true as the app grows.
- **GitHub free tier covers all of it** — private repo, Dependabot alerts, CI later. ₹0.

### 6.2 Security posture (why Cam is hard to attack, and what we still do)

The honest enterprise read: Cam's architecture gives it an unusually **small attack surface** — there is no backend to breach, no user accounts to steal, no photo database to leak, and (in the MVP) essentially no network traffic at all. Most of what makes apps dangerous simply doesn't exist here. That's not luck; it's the on-device design paying a second dividend.

What remains is real, and we handle each:

| Threat | Why it applies to Cam | Control |
|--------|----------------------|---------|
| **Supply chain** (malicious/compromised npm or native package) | Our #1 actual risk — the app is mostly dependencies | Minimal dependency set; pinned versions + committed lockfile; `npm audit` gate before every merge; Dependabot alerts on the repo; new deps require a reason and a reputation check |
| **Data leakage via the app itself** | Camera frames + photos are the crown jewels | Frames processed in-memory and discarded (specced); photo written straight to OS gallery, nothing in app-private storage; **no analytics/crash SDK in MVP** (each one is a data pipe out — we add one later only deliberately, and it will never see images); no image data in logs, ever |
| **Over-permissioning** | Permissions are the OS attack surface | Camera + add-only photo access and nothing else (specced §7); any new permission request is a plan-level decision, not a code change |
| **Insecure transport** | Only if/when the app ever talks to a network | iOS App Transport Security stays on (HTTPS-only enforced by OS); MVP makes zero network calls, so this is a standing rule, not current work |
| **Reverse engineering / tampering** | Low stakes for MVP (no secrets inside) | OS code signing covers MVP; Android R8/obfuscation when Android ships |
| **Stale platform/deps** | Vulns age in | Monthly dependency review cadence post-launch; RN/plugin upgrades done deliberately, not automatically |

**Process guarantee:** before TestFlight (S7 gate), an independent fresh-context **security review** audits the codebase against this table plus the OWASP Mobile Top 10 and produces `SECURITY-REVIEW.md` in the project — reviewer is never the author. Any high-severity finding blocks the release.

## 7. Decisions log

| Decision | Choice | When |
|----------|--------|------|
| Framework | React Native + Vision Camera (Flutter = contained Plan B) | Spec v0.2 |
| Intelligence | Fully on-device detection + composition rules engine | Spec v0.2 |
| Launch platform | iOS-first; Android fast-follow when device + account exist | Plan v1.0 |
| MVP scene types | **Portrait + Food**; pose → v1.1 | Plan v1.1 (founder) |
| Launch pricing | **Free**; monetize only after product-love is proven | Plan v1.1 (founder) |
| Source control | Git from S0; private GitHub repo; main always shippable | Plan v1.2 |
| Security | On-device/no-backend posture + supply-chain controls + pre-ship independent security review (§6.2) | Plan v1.2 |

Still open: **confirm ~3 sessions/week is realistic** — the timeline scales linearly with this. Otherwise S0 starts on your word.

---

*Next artifact after your approval: none — we build. First checkpoint: end of S1, the go/no-go demo.*
