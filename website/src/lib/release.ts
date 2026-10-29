/**
 * The build the site points at.
 *
 * One place to bump: the tag, the artifact names (electron-builder's
 * `${productName}-${version}-${arch}.${ext}`) and the release page all derive
 * from it, so a new alpha cannot half-update the download page.
 */
const version = '0.1.0-alpha.1';
const tag = `v${version}`;
const downloadBase = `https://github.com/flashrod/orb/releases/download/${tag}`;

export const release = {
  version,
  tag,
  channel: 'alpha',
  /** LSMinimumSystemVersion in the packaged app. */
  minimumMacOS: 'macOS 13 Ventura',
  architecture: 'Apple Silicon (M1 or newer)',
  dmg: `${downloadBase}/Orb-${version}-arm64.dmg`,
  zip: `${downloadBase}/Orb-${version}-arm64.zip`,
  page: `https://github.com/flashrod/orb/releases/tag/${tag}`,
  allReleases: 'https://github.com/flashrod/orb/releases',
  issues: 'https://github.com/flashrod/orb/issues',
  newIssue: 'https://github.com/flashrod/orb/issues/new',
} as const;
