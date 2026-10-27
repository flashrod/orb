export const navLinks = [
  { id: 'top', label: 'Overview' },
  { id: 'product', label: 'Product' },
  { id: 'privacy', label: 'Privacy' },
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
    body: 'Press ⌘T and type. Open tabs, history, Spaces, profiles, and addresses arrive in one ranked list. Tabs from the same host collapse into a single result.',
  },
  {
    id: 'blocking',
    icon: 'shield',
    title: 'Blocking that reads the rulebook.',
    body: 'Orb parses EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules. It strips common fingerprinting headers and blocks third party cookies by default.',
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
    title: 'Press ⌘T for the rest.',
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
