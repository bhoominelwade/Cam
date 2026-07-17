# Cam — Security Review (SECURITY-REVIEW.md)

- **Date:** 2026-07-17
- **Reviewer:** independent fresh-context review (not the author of the code under review)
- **Commit reviewed:** `480dcf34c43dd88c688bc8c170abd2acd249a411` (branch `s6-polish`)
- **Scope:** `app/` (source, config, lockfile), `packages/composition-engine/`, `.github/workflows/ci.yml`, `.gitignore`, docs claims in PLAN.md §6.2 and ARCH.md §5, OWASP Mobile Top 10 (2024)

## Verdict: **SHIP WITH FIXES**

No High-severity findings. The core security posture claims are substantially true: the app source contains **zero networking code** (verified by grep of every tracked source file, not just the CI gate's subset), **no analytics/crash SDKs**, **no logging of image data or anything else** (`console.*` appears nowhere in tracked source), **no secrets anywhere in the repo**, and the composition engine is genuinely pure (no external imports). Three Medium findings — a photo temp file that is never deleted, an over-broad photo-library permission declaration injected by a config plugin, and a bypassable CI no-network gate — should be fixed before TestFlight, but none is a High per this review's honest read of exploitability.

Findings count: **High 0 · Medium 3 · Low 2 · Informational 4**

---

## Findings

### High

None.

### Medium

#### M-1 · Captured photos are written to app-sandbox temp storage and never deleted

**Evidence:** `app/src/capture/useCapture.ts:32-42`

```ts
const file = await photoOutput.capturePhotoToFile({ flashMode }, {});
const permission = await MediaLibrary.requestPermissionsAsync(true);
if (!permission.granted) { ... return; }          // ← file abandoned on disk
await MediaLibrary.saveToLibraryAsync('file://' + file.filePath);  // ← copies; original never removed
```

VisionCamera's `capturePhotoToFile` writes the JPEG to the app sandbox's temporary directory (verified: `node_modules/react-native-vision-camera/ios/Extensions/URL+createTempURL.swift:23` uses `FileManager.default.temporaryDirectory`). The file is **never deleted** on any path:

- **Success path:** `saveToLibraryAsync` *copies* the file into the Photos library; the original stays in `tmp/` until iOS opportunistically purges it (which is not deterministic and can be days).
- **Permission-denied path (worse):** the user explicitly declines to let Cam keep the photo — yet the photo already exists on disk inside the app container and remains there.
- **Save-error path:** same abandonment via the `catch`.

This directly contradicts ARCH §5 ("no image data ever serialized to disk") and PLAN §6.2 ("photo written straight to OS gallery, nothing in app-private storage"). Real-world exposure is limited (iOS sandbox; `tmp/` is excluded from backups; no file-sharing entitlement is enabled), which is why this is Medium and not High — but it is a broken privacy promise, an accumulation of user photos in app-private storage, and a forensic-artifact surface, in the one code path that handles the crown jewels.

**Recommendation:** Delete the temp file in a `finally` block covering all three paths (add `expo-file-system` and call `new File(file.filePath).delete()`, or equivalent), and add an e2e-checklist item asserting the temp dir is empty after capture. Also update ARCH §5 / PLAN §6.2 to describe the capture flow honestly: the photo *transits* a temp file which the app deletes immediately — "straight to gallery" is not literally what the code does.

#### M-2 · Built app will declare full photo-library read permission (`NSPhotoLibraryUsageDescription`) despite the add-only claim

**Evidence:** `app/app.json:30-38` (plugin config sets only `savePhotosPermission`) + `app/node_modules/expo-media-library/plugin/build/withMediaLibrary.js:26-33` + `@expo/config-plugins/build/ios/Permissions.js` (`applyPermissions`: a permission is only *removed* when its option is explicitly `false`; when undefined the default string is injected).

Because `photosPermission` is not set to `false`, `expo prebuild` will inject `NSPhotoLibraryUsageDescription = "Allow Cam to access your photos"` — the **full read** photo-library usage declaration — into the built Info.plist, alongside the intended add-only key. The runtime code is clean (`MediaLibrary.requestPermissionsAsync(true)` at `useCapture.ts:34` requests write-only, and the app never requests read), but the shipped binary will declare read access it never uses. That contradicts PLAN §6.2's "Camera + add-only photo access and nothing else", undermines the in-app copy "It never reads your existing photos", creates App Store privacy-label/review friction, and leaves a loaded declaration for any future code path to silently exercise.

Same root cause on Android: the plugin unconditionally adds `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, **`READ_MEDIA_AUDIO`**, `READ_MEDIA_VISUAL_USER_SELECTED` and sets `requestLegacyExternalStorage="true"` (`withMediaLibrary.js:6-11, 34-40`). The `android.permissions: ["android.permission.CAMERA"]` list in `app.json:19-21` does not block plugin-merged permissions. Android is not shipping in the MVP, so this half is latent — but it must be fixed (via `android.blockedPermissions` and `granularPermissions: ["photo"]`) before the Android fast-follow.

**Recommendation:** In `app/app.json`, set `"photosPermission": false` in the `expo-media-library` plugin options; add `android.blockedPermissions` for the storage/media-read permissions; verify with `npx expo prebuild` that the generated Info.plist contains `NSPhotoLibraryAddUsageDescription` and **not** `NSPhotoLibraryUsageDescription`. Add that verification to the S7 checklist.

#### M-3 · The CI no-network gate is narrow, bypassable, and does not gate the builds that actually ship

**Evidence:** `.github/workflows/ci.yml:3-6, 44-54`

The gate is good defense-in-depth but currently over-trusted relative to how PLAN/ARCH cite it ("a CI grep gate fails the build if networking imports appear"). Concrete false-negative paths:

1. **Scope:** it greps only `app/src`. `app/App.tsx`, `app/index.ts`, `app/metro.config.js`, and any future sibling directory under `app/` are outside the gate — `fetch()` in `App.tsx` ships silently. `ci.yml:47`.
2. **Pattern gaps:** the regex catches `import ... from 'axios'`-style imports of five named packages plus literal `XMLHttpRequest` / `WebSocket(` / `fetch(`. It misses: `require('axios')`, dynamic `import('...')`, aliasing (`const f = globalThis.fetch` then `f(url)`), `expo-file-system` `uploadAsync`/`downloadAsync`, a remote `source={{ uri: 'https://…' }}` on an `<Image>`, `expo-image`/WebView components, `EventSource`, `navigator.sendBeacon`, and — most importantly — **networking inside any dependency or native module**, which no source grep can see.
3. **Trigger gap:** the workflow runs only on PRs and pushes to `main` (`ci.yml:3-6`). Slice branches (like the one under review) get no CI on direct pushes, and EAS builds/`eas submit` are triggered manually from whatever is checked out — nothing chains a TestFlight build to a green gate. A build cut from a branch never passes through the gate at all.

**Recommendation:** (a) widen the grep to all of `app/` excluding `node_modules`; (b) add `require\(|import\(|sendBeacon|EventSource|uploadAsync|downloadAsync` and scan for `https?://` string literals in app source; (c) run the workflow on `push: branches: ['**']`; (d) write down (README or PLAN) that TestFlight submissions happen only from a green-CI commit on `main`, and enable branch protection on `main`. Keep expectations honest: the gate catches accidents, not adversaries — the real control for dependency-borne networking is the minimal-dependency discipline plus review, which is fine to say.

### Low

#### L-1 · Dependency versions are ranged, not pinned exactly, contradicting the stated control

**Evidence:** `app/package.json:8-13, 26-30` (`"expo": "~57.0.7"`, `"expo-media-library": "~57.0.3"`, `"@types/jest": "^29.5.12"`, `"typescript": "~6.0.3"`, etc.) vs PLAN §5 ("Pin exact versions") and §6.2 ("pinned versions + committed lockfile").

Mitigation is real: both lockfiles are committed (`app/package-lock.json`, `packages/composition-engine/package-lock.json`), CI installs with `npm ci` (`ci.yml:20, 37`), and EAS respects the lockfile — so builds are reproducible today. The ranges only bite on a manual `npm install`/`npm update`, which then lands a silent minor-version jump in the lockfile diff. The engine package, correctly, pins exact (`packages/composition-engine/package.json:12-17`). Note the native/ML-critical deps (react-native, vision-camera, skia, reanimated, worklets, zustand) *are* exact — only the Expo-managed and dev-tooling deps float.

**Recommendation:** Either pin the remaining ranges exactly (`npm config set save-exact true`), or amend PLAN §6.2 to say "lockfile-pinned" and rely on lockfile review discipline. Small either way; pick one and be consistent.

#### L-2 · The claimed secret-scanning check does not exist in CI

**Evidence:** PLAN §6.1 ("A `.gitignore` + a secret-scanning check from day one") vs `.github/workflows/ci.yml` — there is no secret-scanning step. The `.gitignore` half is done well (`.gitignore:9-13, 25-27` covers `.env*`, `*.p8/.p12/.key/.jks/.mobileprovision`; `app/.gitignore:15-19, 31` adds `*.pem`). GitHub's server-side secret scanning / push protection may be enabled on the private repo, but that is a repo setting this review cannot verify from the checkout. A full-repo grep for credential patterns (API keys, AWS/GitHub/Slack token shapes, private-key headers) found **nothing** — the only hits are lockfile package names and the docs' own prose. The EAS `projectId` and `owner` in `app/app.json:39-44` are identifiers, not secrets.

**Recommendation:** Add a gitleaks (or equivalent) step to `ci.yml` so the claimed control is a real, in-repo, verifiable gate; confirm GitHub push protection is on.

### Informational

- **I-1 · Unreferenced dependency `react-native-nitro-image`** (`app/package.json:16`) is imported nowhere in app source. It is plausibly a required native peer of VisionCamera 5's Nitro-based photo pipeline; verify, and remove if not needed. Every unused dependency is free supply-chain surface (OWASP M2). Same question, milder, for `react-native-vision-camera-worklets` (used implicitly by `useAsyncRunner`) — that one is legitimate.
- **I-2 · No lint step in CI** despite ARCH §6 claiming "typecheck + lint + unit tests + audit on every PR" (`ci.yml` has typecheck, tests, audit — no lint). Process-claim mismatch, not a vulnerability.
- **I-3 · `npm audit --audit-level=high`** (`ci.yml:23, 40`) lets moderate advisories pass silently. Reasonable trade-off; just noting it is a choice, and Dependabot (claimed in PLAN §6.2) is a repo setting not verifiable from the checkout — confirm it is enabled.
- **I-4 · Things checked that are simply fine:** `DebugHud` is dev-only (`__DEV__` gate, `DebugHud.tsx:22`) and displays only fps/scene labels, no image data; capture errors surface one human sentence and swallow the exception (`useCapture.ts:44-46`) — no stack traces or paths leak to UI or logs; permission UX matches ARCH §5 (camera asked at launch with honest copy and a designed denial screen with settings deep-link, `CameraScreen.tsx:141-154`; add-only photo permission asked at first capture, `useCapture.ts:34`); frames are processed in-memory in the worklet and explicitly `dispose()`d on every path (`CameraScreen.tsx:96-116`); the engine has zero runtime dependencies and validates its input domain (`packages/composition-engine/src/invariants.ts`); the repo's memory/docs files contain project context but no credentials or meaningful PII.

---

## OWASP Mobile Top 10 (2024) mapping

| # | Risk | Status for Cam |
|---|------|----------------|
| M1 | Improper credential usage | **N/A / Pass.** No credentials, tokens, or keys exist in the app or repo (verified by pattern search). Signing stays in EAS/Apple infrastructure. |
| M2 | Inadequate supply chain security | **Adequate with fixes.** Committed lockfiles + `npm ci` + audit gate are real; version ranges (L-1), one unreferenced dependency (I-1), and unverifiable Dependabot claim (I-3) are the gaps. This remains the app's #1 structural risk, as PLAN honestly says. |
| M3 | Insecure authentication/authorization | **N/A / Pass.** No accounts, no auth, no backend. |
| M4 | Insufficient input/output validation | **Pass.** Detector output is normalized and clamped in one tested module (`app/src/detection/transforms.ts:35-70`); the engine defines and tests its valid-input domain (`invariants.ts`); no user-controlled strings are parsed, no WebView, no deep-link handling, no IPC surface. |
| M5 | Insecure communication | **Pass, with a caveat.** Zero networking code in the entire app source (independently verified beyond the CI gate's subset). ATS defaults untouched. The caveat is enforcement: the CI gate has false-negative paths (M-3). |
| M6 | Inadequate privacy controls | **Mostly pass.** No analytics/crash SDKs, no logging, honest permission copy, add-only runtime request. The two dents are the undeleted temp photo (M-1) and the over-broad plist declaration (M-2). |
| M7 | Insufficient binary protections | **Accepted risk, appropriate.** No secrets or proprietary server logic in the binary; OS code signing only, per PLAN §6.2. Correct call for this app's stakes. |
| M8 | Security misconfiguration | **Needs fixes.** M-2 (permission over-declaration is exactly this category), M-3 (gate/workflow triggers), L-2 (missing claimed CI control). No debug-in-release issues found (HUD is `__DEV__`-gated; `eas.json` profiles are sane). |
| M9 | Insecure data storage | **Needs fix.** M-1 is this category: photos persisted, unencrypted and unmanaged, in app-private temp storage. Everything else stores nothing (no DB, no AsyncStorage, no files). |
| M10 | Insufficient cryptography | **N/A / Pass.** The app performs no cryptography and stores nothing that needs it; nothing weak is present either. |

---

## PLAN §6.2 threat-table verification

| Threat row | Claimed control | Verified? |
|---|---|---|
| **Supply chain** | Minimal deps; pinned versions + committed lockfile; `npm audit` gate; Dependabot; new-dep vetting | **Partially.** Lockfiles committed and CI uses `npm ci` + `npm audit --audit-level=high` (real). Dependency set is genuinely small for an RN app. But: versions are tilde/caret ranges, not exact pins (L-1); Dependabot is unverifiable from the repo (I-3); one dependency has no visible use (I-1). |
| **Data leakage via the app** | Frames in-memory and discarded; photo straight to OS gallery, nothing in app-private storage; no analytics/crash SDK; no image data in logs | **Mostly, with one real break.** Frames: verified — worklet-only, `dispose()` on every path, never serialized. No analytics/crash SDKs: verified in `package.json` and source. No image data (or anything) in logs: verified — zero `console.*` in tracked source. **Broken:** "nothing in app-private storage" — captured photos transit the app temp dir and are never deleted, including when the user denies the save permission (M-1). |
| **Over-permissioning** | Camera + add-only photo access and nothing else | **Runtime yes, manifest no.** Runtime requests exactly camera + write-only photos, at the right moments. But the built Info.plist will additionally declare full photo-library read, and a future Android manifest would carry six extra storage/media permissions, all from `expo-media-library` plugin defaults (M-2). |
| **Insecure transport** | ATS stays on; MVP makes zero network calls | **Verified.** No networking code anywhere in app source; no ATS exceptions configured in `app.json`; no URLs fetched. The CI enforcement of this is weaker than described (M-3), but the current code is clean. |
| **Reverse engineering / tampering** | OS code signing; no secrets inside | **Verified.** Nothing sensitive to extract from the binary; no secrets in repo or config. Accepted-risk posture is appropriate. |
| **Stale platform/deps** | Monthly review cadence post-launch; deliberate upgrades | **Not yet testable** (process claim about post-launch behavior). The mechanical prerequisites (lockfiles, audit gate) exist. Mark as a standing commitment, not a verified control. |

---

## Bottom line

The architecture does the heavy lifting exactly as the docs claim — no backend, no accounts, no network, no storage, no telemetry — and the code matches those claims far more closely than most projects' code matches their security docs. Fix the three Mediums (delete the capture temp file; suppress the read-library permission declaration; harden and properly wire the CI gate) before the S7 TestFlight gate, tidy the two Lows at leisure, and this is a defensible privacy story you can put in front of App Store review and users.

---

## Remediation addendum (same day, by the author — 2026-07-17)

Applied after the review, in the commit that includes this addendum:

- **M-1 fixed** — `useCapture.ts` now deletes the capture temp file in a `finally` block via `expo-file-system`'s `File.delete()`, covering the save, permission-denied, and error paths alike.
- **M-2 fixed** — `app.json` media-library plugin now sets `"photosPermission": false` and `"isAccessMediaLocationEnabled": false` (no read-library string in the built Info.plist), and Android `blockedPermissions` strips every read-media permission the plugin would inject.
- **M-3 hardened** — the CI no-network gate now scans **all tracked first-party TS/JS** in `app/` and `packages/` (not just `app/src`), with a broader pattern (dynamic `require`, `EventSource`, `expo-file-system` network helpers, etc.), and CI runs on every branch push. Residual limits (dependency-level networking, manual EAS builds not machine-chained to CI) are accepted and documented; `e2e-checklists/s7-ship.md` requires building only from a green main.
- **L-2 fixed** — a `gitleaks` secret-scanning job now runs in CI on full history.
- **L-1 accepted** — Expo-convention `~`/`^` ranges stay; the committed lockfiles + `npm ci` make installs exactly reproducible, which is the property the plan actually needs.

Re-verification of these fixes belongs to the next fresh-context review before the S7 gate.
