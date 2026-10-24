# Releasing Orb

Orb ships through **GitHub Releases** on the public `flashrod/orb` repo.
The workflow is `.github/workflows/release.yml`.

- **macOS:** arm64 only (Apple Silicon). Produces a DMG and a ZIP (the ZIP is
  what auto-update will use later).
- **Windows:** x64 NSIS, built manually from the Actions tab. Unsigned for now.
- **Intel Macs:** not built.

## Cutting a build

The workflow runs on any tag starting with `v`:

```sh
npm version prerelease --preid=beta   # 0.1.1-beta.0
git push --follow-tags
```

or, for a stable version:

```sh
npm version patch                     # 0.1.1
git push --follow-tags
```

The workflow checks that the tag matches `package.json`'s version. Tags
containing a hyphen (`v0.1.1-beta.0`) are marked as **pre-releases**; plain
tags are published as normal releases.

You can also run the workflow manually from the Actions tab. That builds the
macOS app without publishing, and optionally builds an unsigned Windows
installer.

## Friends builds (no Apple account)

Leave the signing secrets unset. The workflow still produces a DMG/ZIP, but
the app is unsigned. On first launch your friends will need:

1. Open the DMG and drag Orb to Applications.
2. Try to open it once.
3. Go to **System Settings → Privacy & Security → Open Anyway**.
4. Or run `xattr -dr com.apple.quarantine /Applications/Orb.app`.

Updates are manual until the app is signed.

## Public beta (signed + notarized)

You need an **Apple Developer Program** membership ($99/year). Then:

1. Create a **Developer ID Application** certificate in the Apple Developer
   portal and export it as a `.p12`.
2. Create an **App Store Connect API key** with App Manager access. Download
   the `.p8` once.
3. Add these repository secrets:

| Secret | Value |
| --- | --- |
| `CSC_LINK` | base64 of the `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `CSC_KEY_PASSWORD` | password for the `.p12` |
| `APPLE_API_KEY` | base64 of the `.p8` (`base64 -i AuthKey_XXXX.p8 \| pbcopy`) |
| `APPLE_API_KEY_ID` | the 10-character key ID |
| `APPLE_API_ISSUER` | the issuer UUID |

Alternatively, set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and
`APPLE_TEAM_ID` instead of the API key secrets.

With those present, electron-builder signs with the Developer ID, the
`afterSign` hook in `scripts/notarize.cjs` submits the app for notarization and
staples the ticket, and the release opens without a Gatekeeper warning.

## Icon

The DMG currently uses Electron's default icon. Before a public beta, add a
1024×1024 `build/icon.icns` (and `build/icon.ico` for Windows). electron-builder
picks them up automatically.

## Auto-update

Not wired yet. The workflow already uploads `latest-mac.yml`, so the feed is
ready once `electron-updater` is added. Auto-update on macOS requires signed
builds, so it should land after notarization is working.

## Local packaging

```sh
npm run dist:mac   # DMG + ZIP in release/
npm run dist:win   # NSIS installer, run on Windows
```

Do not run these unless you actually want a local package; the release
workflow is the normal path.
