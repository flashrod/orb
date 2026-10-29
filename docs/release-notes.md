# Orb 0.1.0-alpha.2

Second alpha build. Fixes found during the first reviewer pass:

- **Shortcut matcher no longer throws on real keypresses.** Typing unmatched keys in the address bar (or anywhere) stopped producing page errors after the Ctrl/Meta swap fallback was rebuilt to not spread a raw DOM `KeyboardEvent`.
- **Websites can no longer see `window.orbPageApi`.** Picker results and Glance link suggestions now travel as validated DOM events through the preload instead of a context-bridge bridge, removing a fingerprint marker.
- **User agent no longer reveals Orb or Electron.** Every session now reports a Chrome-style UA built from the real Chromium version with the standard macOS Intel token.
- **Crashed tabs show a real page.** A tab whose renderer dies shows "This tab crashed" with the URL, reason, and a Reload button — auto-reloading once per tab, rate-limited to once per minute.
- **Tabs stay visible in window fullscreen.** New `Show tabs in fullscreen` setting (on by default) keeps the tab strip, toolbar and bookmarks bar visible; HTML5 (video) fullscreen still hides all chrome.
- **Bookmark rename works again.** `window.prompt` (which throws in Electron) is replaced by an inline rename input; delete uses a confirm dialog with undo.

Everything from alpha.1 still works: tabs, Spaces, split view, ad/tracker blocking, Boosts, profiles, history, keyboard shortcuts, crash reporting, and update check.

## Installing an unsigned build

This build is **not signed or notarized** — there is no Apple Developer account behind it yet. macOS will refuse to open it on the first try.

1. Open the DMG and drag **Orb** to Applications.
2. Open Orb once. macOS will block it.
3. Go to **System Settings → Privacy & Security → Open Anyway**.
4. Or, in Terminal:

   ```sh
   xattr -dr com.apple.quarantine /Applications/Orb.app
   ```

Orb stores its data in `~/Library/Application Support/Orb`. Replacing the app keeps your tabs, history, and settings.

## Known limitations

- **Apple Silicon only.** No Intel or Windows builds in this release.
- **No automatic updates.** Updating means downloading the new build and replacing Orb in Applications.
- **No sync and no account.** Your data stays on this Mac.
- **Not notarized.** The first launch needs the step above each time you replace the app.

## Reporting something

Use **Help ▸ Send feedback** or **Settings ▸ About ▸ Send feedback**. It opens a GitHub issue with your Orb, Electron, Chromium, and macOS versions already filled in. If Orb crashed, the crash screen has a **Report on GitHub** button that includes the stack.

A rough description of what you clicked is more useful than a polished one.
