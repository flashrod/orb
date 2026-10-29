# Orb 0.1.0-alpha.1

The first build anyone outside this machine has run. It is an **alpha**: expect
rough edges, and expect them in places you would not think to check.

## What works

- **Tabs, Spaces, and pinned sites.** A vertical Space rail with per-Space tabs,
  a start page with essentials and recent pages, and a command bar on ⌘K.
- **Split view.** Right-click a tab and choose *Open in split view*. There is
  deliberately no toolbar button for it.
- **Privacy on by default.** Ads and trackers are blocked, and addresses are
  upgraded to HTTPS where the site supports it.
- **Boosts.** Per-site CSS and JS, plus an element picker for quick tweaks.
- **Profiles.** Separate cookie jars for work and personal browsing.
- **History, downloads, bookmarks, and tab groups.**
- **Keyboard shortcuts.** One registry, a recorder, conflict detection, JSON
  import/export, presets, and per-site passthrough.
- **Crash and feedback reporting.** A render error shows a real screen with a
  Reload button and a prefilled GitHub issue, instead of a blank window.
- **Update check.** About ▸ Updates tells you when a newer build exists.

## Installing an unsigned build

This build is **not signed or notarized** — there is no Apple Developer account
behind it yet. macOS will refuse to open it on the first try.

1. Open the DMG and drag **Orb** to Applications.
2. Open Orb once. macOS will block it.
3. Go to **System Settings → Privacy & Security** and choose **Open Anyway**.
4. Or, in Terminal:

   ```sh
   xattr -dr com.apple.quarantine /Applications/Orb.app
   ```

Orb stores its data in `~/Library/Application Support/Orb`. Replacing the app
keeps your tabs, history, and settings.

## Known limitations

- **Apple Silicon only.** No Intel or Windows builds in this release.
- **No automatic updates.** Updating means downloading the new build and
  replacing Orb in Applications.
- **No sync, no account.** Everything stays on this Mac, which also means
  nothing follows you to another machine.
- **Not notarized.** The first launch needs the step above every time you
  replace the app.

## Reporting something

Use **Help ▸ Send feedback** or **Settings ▸ About ▸ Send feedback**. It opens a
GitHub issue with your Orb, Electron, Chromium, and macOS versions already
filled in. If Orb crashed, the crash screen has a **Report on GitHub** button
that includes the stack.

A rough description of what you clicked is more useful than a polished one.
