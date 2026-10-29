export const navLinks = [
  { id: 'top', label: 'Overview' },
  { id: 'product', label: 'Product' },
  { id: 'features', label: 'Features' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'faq', label: 'FAQ' },
] as const;

export const benefits = [
  {
    id: 'spaces',
    icon: 'spaces',
    title: 'Work stays at work. So does the research spiral.',
    body: 'Every Space holds its own tabs and pinned sites. Name it, color it, and switch without reopening a thing.',
  },
  {
    id: 'command',
    icon: 'command',
    title: 'Reach anything in one keystroke.',
    body: 'Press ⌘K and type. Open tabs, history, Spaces, profiles, and addresses arrive in one ranked list. Tabs from the same host collapse into a single result.',
  },
  {
    id: 'blocking',
    icon: 'shield',
    title: 'Blocking that reads the rulebook.',
    body: 'Orb parses EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules. It strips common fingerprinting headers, removes tracking parameters from links, and blocks third party cookies by default.',
  },
  {
    id: 'boosts',
    icon: 'cursor',
    title: 'Make the sites you use every day quieter.',
    body: 'Add per site CSS, or point the element picker at a banner and let it write the selector. The Boost stays on that domain.',
  },
  {
    id: 'themes',
    icon: 'palette',
    title: 'A browser you can restyle.',
    body: 'Warm Paper, Sage, and Night themes. Accent colors, density, and a sidebar that can stay out of the way.',
  },
] as const;

export const features = [
  {
    id: 'spaces',
    tag: 'SHIPPED',
    title: 'Spaces & profiles',
    summary: 'Tabs, bookmarks, and history isolated by context.',
    body:
      'Each Space holds its own set of tabs and pinned sites. Profiles keep cookies, cache, and site storage separate, so work and personal logins never mix. Switching Spaces selects the matching profile session, and open tabs restore on restart.',
    href: '/features/spaces',
    icon: 'spaces',
  },
  {
    id: 'command-bar',
    tag: 'SHIPPED',
    title: 'Command bar (⌘K)',
    summary: 'One input for tabs, Spaces, profiles, and URLs.',
    body:
      'Press ⌘K and type. Open tabs, history, Spaces, profiles, and addresses arrive in one ranked list. Tabs from the same host collapse into a single result, so you never hunt through duplicate entries.',
    href: '/features/command-bar',
    icon: 'command',
  },
  {
    id: 'privacy',
    tag: 'SHIPPED',
    title: 'Privacy & Shields',
    summary: 'Requests are blocked before they load, with a receipt.',
    body:
      'Orb parses EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules in the main process. Tracking parameters are stripped from links, third party cookies are blocked by default, and every blocked request lists the URL, the site, and the rule that matched.',
    href: '/features/privacy',
    icon: 'shield',
  },
  {
    id: 'boosts',
    tag: 'SHIPPED',
    title: 'Per-site Boosts',
    summary: 'Custom CSS and JavaScript for any domain.',
    body:
      'Add per site CSS or point the element picker at a banner and let Orb write the selector. Boosts are stored per domain in SQLite and applied only to matching sites, so your changes follow you across restarts.',
    href: '/features/boosts',
    icon: 'cursor',
  },
  {
    id: 'tabs',
    tag: 'SHIPPED',
    title: 'Tabs, split view & Glance',
    summary: 'Vertical rail, side-by-side panes, and link previews.',
    body:
      'Choose a horizontal strip or a vertical tab rail. Open two pages side by side, swap panes, and resize the divider without losing either tab. Hover a link to open a Glance preview without leaving the page, and hibernate tabs you are not using.',
    href: '/features/tabs',
    icon: 'tabs',
  },
  {
    id: 'shortcuts',
    tag: 'SHIPPED',
    title: 'Keyboard shortcuts',
    summary: 'Remappable commands with Chrome, Safari, and Arc presets.',
    body:
      'Every action is in a single registry with defaults you can override. Chrome, Safari, and Arc keymap presets ship out of the box, so muscle memory carries over.',
    href: '/shortcuts',
    icon: 'shortcuts',
  },
] as const;

export const steps = [
  {
    title: 'Join the beta.',
    body: 'Leave your email. We send one message when the macOS build is ready. No account and no onboarding funnel.',
  },
  {
    title: 'Make a Space.',
    body: 'One for work, one for reading, one for the thing you are researching. Each keeps its own tabs and pinned sites.',
  },
  {
    title: 'Press ⌘K for the rest.',
    body: 'Jump to a tab, a Space, a profile, or a URL from one input. Then close the command bar and get back to it.',
  },
] as const;

export const privacyPoints = [
  {
    icon: 'shield',
    title: 'Requests stop before they load',
    body: 'Network rules from EasyList, uBlock Origin, EasyPrivacy, and CookieMonster run in the main process.',
  },
  {
    icon: 'fingerprint',
    title: 'Less to fingerprint',
    body: 'Orb removes client hint headers, trims language granularity, and disables non proxied WebRTC by default.',
  },
  {
    icon: 'cookie',
    title: 'Cookies stay first party',
    body: 'Third party cookies and their response headers are dropped by default. Add a site to the allowlist when a sign in breaks.',
  },
  {
    icon: 'log',
    title: 'You can read the log',
    body: 'Every blocked request lists the URL, the site, and the rule that matched it. Clear the log whenever you want.',
  },
  {
    icon: 'link',
    title: 'Links stay clean',
    body: 'Tracking parameters such as utm_source, fbclid, and gclid are stripped before navigation, so shared addresses stay short and readable.',
  },
] as const;

export const betaItems = [
  'Spaces with per Space tabs and pinned sites',
  'Command bar search across tabs, history, Spaces, and profiles',
  'Ad and tracker filtering from imported filter lists',
  'Third party cookie blocking, HTTPS upgrades, and header reduction',
  'A blocked request log with the matching rule',
  'Per site CSS Boosts with an element picker',
  'Profiles, split view, bookmarks, and session restore',
  'Themes, accent colors, density, and keyboard shortcuts',
] as const;

export const notYetItems = [
  'Arc export import. The parser is on the roadmap, not in the build.',
  'The Chrome Web Store. You can load an unpacked extension from disk.',
  'Sync between devices. There is no cloud account.',
  'Windows and Linux builds. macOS comes first.',
] as const;

export const shortcuts = [
  {
    category: 'Tabs',
    items: [
      { id: 'new-tab', title: 'New Tab', bindings: ['⌘T'] },
      { id: 'tab.close', title: 'Close Tab', bindings: ['⌘W'] },
      { id: 'tab.reopen-closed', title: 'Reopen Closed Tab', bindings: ['⌘Shift+T'] },
      { id: 'tab.next', title: 'Next Tab', bindings: ['Ctrl+Tab'] },
      { id: 'tab.previous', title: 'Previous Tab', bindings: ['Ctrl+Shift+Tab'] },
      { id: 'tab.go-to', title: 'Go to Tab (1–8)', bindings: ['⌘1 … ⌘8'] },
      { id: 'tab.go-to-last', title: 'Go to Last Tab', bindings: ['⌘9'] },
      { id: 'tab.pin', title: 'Pin Tab', bindings: [] },
      { id: 'tab.hibernate', title: 'Hibernate This Tab', bindings: [] },
      { id: 'tab.mute', title: 'Mute Tab', bindings: [] },
      { id: 'tab.duplicate', title: 'Duplicate Tab', bindings: [] },
    ],
  },
  {
    category: 'Spaces',
    items: [
      { id: 'new-space', title: 'New Space', bindings: [] },
      { id: 'space.switch', title: 'Switch to Space (1–5)', bindings: ['Ctrl+1 … Ctrl+5'] },
      { id: 'space.next', title: 'Next Space', bindings: [] },
      { id: 'space.previous', title: 'Previous Space', bindings: [] },
      { id: 'space.switch-profile', title: 'Switch Profile', bindings: [] },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { id: 'focus-address', title: 'Focus Address Bar', bindings: ['⌘L'] },
      { id: 'command-bar', title: 'Open Command Bar', bindings: ['⌘K'] },
      { id: 'nav.back', title: 'Back', bindings: ['⌘['] },
      { id: 'nav.forward', title: 'Forward', bindings: ['⌘]'] },
      { id: 'nav.reload', title: 'Reload', bindings: ['⌘R'] },
      { id: 'nav.hard-reload', title: 'Hard Reload', bindings: ['⌘Shift+R'] },
      { id: 'find', title: 'Find', bindings: ['⌘F'] },
      { id: 'history', title: 'History', bindings: ['⌘Y'] },
    ],
  },
  {
    category: 'View',
    items: [
      { id: 'toggle-compact', title: 'Toggle Compact Mode', bindings: ['⌘Shift+M'] },
      { id: 'toggle-fullscreen', title: 'Toggle Fullscreen', bindings: [] },
      { id: 'view.toggle-sidebar', title: 'Toggle Sidebar', bindings: [] },
      { id: 'view.zoom-in', title: 'Zoom In', bindings: [] },
      { id: 'view.zoom-out', title: 'Zoom Out', bindings: [] },
      { id: 'view.zoom-reset', title: 'Reset Zoom', bindings: [] },
    ],
  },
  {
    category: 'Split & Glance',
    items: [
      { id: 'split.open', title: 'Open Split View', bindings: [] },
      { id: 'split.swap', title: 'Swap Panes', bindings: [] },
      { id: 'split.close', title: 'Close Split View', bindings: [] },
      { id: 'glance.open-link', title: 'Open Link in Glance', bindings: [] },
    ],
  },
  {
    category: 'Tools',
    items: [
      { id: 'print', title: 'Print', bindings: ['⌘P'] },
      { id: 'save-pdf', title: 'Save Page as PDF', bindings: [] },
      { id: 'tools.element-picker', title: 'Element Picker', bindings: [] },
      { id: 'tools.copy-url', title: 'Copy URL', bindings: [] },
      { id: 'tools.downloads', title: 'Open Downloads', bindings: [] },
      { id: 'toggle-pip', title: 'Picture in Picture', bindings: [] },
      { id: 'media-play-pause', title: 'Play/Pause Media', bindings: [] },
    ],
  },
  {
    category: 'Privacy',
    items: [
      { id: 'privacy.toggle-blocker', title: 'Toggle Blocker for This Site', bindings: [] },
      { id: 'privacy.toggle-https-only', title: 'Toggle HTTPS-only for This Site', bindings: [] },
    ],
  },
  {
    category: 'App',
    items: [
      { id: 'settings', title: 'Settings', bindings: ['⌘,]'] },
      { id: 'app.toggle-devtools', title: 'Toggle DevTools', bindings: [] },
      { id: 'close-overlays', title: 'Close Overlays', bindings: ['Esc'] },
      { id: 'show-welcome', title: 'Welcome to Orb', bindings: [] },
    ],
  },
] as const;

export const changelog = [
  {
    date: 'October 2026',
    version: '0.1.0',
    title: 'Per-site shortcut passthrough',
    body:
      'Shortcuts now support per-site passthrough rules, so site-specific key combos reach the page instead of the browser. Keymap presets for Chrome, Safari, and Arc ship alongside parameterized commands.',
  },
  {
    date: 'October 2026',
    version: '0.1.0',
    title: 'Vertical tab rail and split view',
    body:
      'Tabs now live in a horizontal strip or a vertical rail. Split view renders two independent pages side by side with a draggable divider, and both layouts support pin, close, and new tab actions.',
  },
  {
    date: 'September 2026',
    version: '0.1.0',
    title: 'History: forget a site or clear a time range',
    body:
      'The history page and settings now let you forget every visit to a host or clear a time range. All data stays local, and nothing is uploaded.',
  },
  {
    date: 'September 2026',
    version: '0.1.0',
    title: 'Profiles, Spaces, and session restore',
    body:
      'Profiles keep cookies, cache, and site storage separate. Each Space belongs to one profile, and open tabs restore on restart. Workspaces can be renamed, recolored, and reordered.',
  },
  {
    date: 'August 2026',
    version: '0.1.0',
    title: 'Real ad and tracker blocking',
    body:
      'Orb parses EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules in the main process. Third party cookies are blocked by default, client hint headers are stripped, and every blocked request is logged with its matching rule.',
  },
  {
    date: 'July 2026',
    version: '0.1.0',
    title: 'Boosts with element picker',
    body:
      'Per-domain CSS and JavaScript Boosts ship with an element picker that generates resilient semantic selectors. Hide cookie banners, reshape layouts, or strip noise on any site.',
  },
] as const;

export const docs = [
  { id: 'getting-started', title: 'Get started', href: 'https://github.com/flashrod/orb#getting-started' },
  { id: 'privacy-model', title: 'Privacy model', href: '/privacy' },
  { id: 'roadmap', title: 'Roadmap', href: 'https://github.com/flashrod/orb/blob/main/ROADMAP.md' },
  { id: 'source', title: 'Source code', href: 'https://github.com/flashrod/orb' },
] as const;

export const faqs = [
  {
    question: 'What is Orb?',
    answer:
      'Orb is a browser for macOS built on Chromium. It gives each part of your day its own Space, puts tabs, history, Spaces, and profiles behind one command bar, and blocks ads and trackers before they load. The app is open source under MIT.',
  },
  {
    question: 'When does the beta open?',
    answer:
      'The public beta opens for macOS first. We have not published a date because the build is still moving. The waitlist gets one email when an invite is ready. Windows and Linux follow after macOS.',
  },
  {
    question: 'What does it cost?',
    answer:
      'The beta is free. The source is MIT licensed. There is no account, subscription, or card.',
  },
  {
    question: 'How is Orb different from Arc?',
    answer:
      'Orb takes the useful shape of Arc, with Spaces and a keyboard first command bar, and builds on it with its own implementation. Browsing data stays on your machine, there is no cloud account, and the source is public. Orb is not affiliated with Arc or The Browser Company.',
  },
  {
    question: 'Does Orb block ads and trackers?',
    answer:
      'Yes. Orb imports EasyList, uBlock Origin, EasyPrivacy, and CookieMonster style rules, blocks matching requests before they load, and records the rule that matched. Some sites still detect blockers. The allowlist in Privacy settings is there for those sites.',
  },
  {
    question: 'Can I import my Arc data?',
    answer:
      'Not yet. The Arc export parser is on the roadmap, not in the current build. We would rather say that than ship an import that loses your Spaces. The waitlist will hear when it lands.',
  },
  {
    question: 'Does Orb support Chrome extensions?',
    answer:
      'Orb can load an unpacked Chromium extension from disk. There is no Chrome Web Store browser yet.',
  },
  {
    question: 'Does Orb sync between devices?',
    answer:
      'No. This version has no sync and no cloud account. Tabs, settings, and browsing data stay on the machine where you installed Orb.',
  },
  {
    question: 'What happens to my email?',
    answer:
      'Your address goes to our waitlist provider and is used to send your beta invite. We do not sell it or add you to a newsletter. If you want it removed, open an issue on GitHub and we will delete it.',
  },
  {
    question: 'Is it ready for daily use?',
    answer:
      'It is a public beta. Core browsing works, and the honest list above shows what is shipped. Rough edges remain. If you need a browser for work you cannot lose, keep another one nearby for now.',
  },
] as const;
