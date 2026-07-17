# Cam — Privacy Policy

*Effective: 2026-07-17*

Cam is a camera app that coaches your composition. Its defining design decision is that **everything happens on your phone**.

## What Cam collects

**Nothing.** Cam has no servers, no accounts, no analytics, and makes **zero network calls**. The app binary contains no networking code — this is enforced by an automated check in our build pipeline.

## How your camera and photos are used

- **Camera frames** are analyzed on your device, in memory, to detect faces or dishes and coach your framing. Frames are processed and immediately discarded — never written to disk, never logged, never transmitted.
- **Photos you take** are saved directly to your system photo library. Cam requests *add-only* access — it cannot see, read, or modify photos already in your library.
- **On-device machine learning** (Apple Vision and Google ML Kit models bundled with the app) runs entirely locally. No image, feature, or measurement ever leaves your phone.

## What Cam stores

Nothing beyond your device's standard app settings (e.g., your last-used flash mode). No photo data is kept in the app's own storage.

## Third parties

There are none. No analytics SDKs, no advertising, no crash-reporting services in this version. If you install via TestFlight, Apple provides us anonymized crash reports under [Apple's own privacy terms](https://www.apple.com/legal/privacy/).

## Changes

If a future version ever adds a network feature, this policy will change *before* that version ships, and the change will be called out in the update notes. Image data leaving your device will never be part of Cam.

## Contact

astlin — via the App Store listing's support link.
