# Orb manual smoke checklist

Run before every release (and after any change to sessions, tabs or IPC).

## Navigation
- [ ] Launch Orb, open a site, press ⌘L, type a bare domain, Enter → loads
- [ ] Back / forward / reload work from the toolbar and from inside a page
- [ ] Tab switch keeps scroll position, form input and video playback
- [ ] ⌘T opens a tab with focus in the address bar; ⌘W closes it
- [ ] ⌘T / ⌘K / ⌘L work while a page (not the chrome) has focus
- [ ] Closing the last tab minimizes; refocusing Orb restores a tab

## Safety
- [ ] A site requesting camera/mic shows the Orb prompt; Deny blocks it
- [ ] "Remember this choice" persists across restart
- [ ] A second profile's site also prompts (profile partitions are hardened)
- [ ] Notifications are denied by default
- [ ] Download starts, appears in the panel with progress, completes
- [ ] Cancel stops an in-flight download
- [ ] `target=_blank` link opens a tab instead of a window
- [ ] Dropping a file onto the chrome does not navigate the shell

## Media & data
- [ ] YouTube plays audio; the tab is not hibernated while audible
- [ ] Paste, drag-and-drop upload and file input work on a page
- [ ] Restart restores tabs, order, pins and groups
- [ ] Bookmarks and Boosts survive restart

## Privacy
- [ ] Shields count blocked requests on an ad-heavy site
- [ ] Allowlisting a domain stops blocking for that site
- [ ] HTTPS-only upgrades an http:// URL and the exception sticks
- [ ] Clearing a profile's data logs that profile out

## Benchmarks
- [ ] `npm run benchmark` completes and writes `benchmarks/latest.md`
- [ ] Record the numbers in the release notes
