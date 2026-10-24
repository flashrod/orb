/**
 * Privacy helpers shared by the main process and renderer. Pure functions only.
 */

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'igshid',
  'ttclid',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'vero_id',
  'vero_conv',
  '_hsenc',
  '_hsmi',
  'hsctatracking',
  'oly_anon_id',
  'oly_enc_id',
  'rb_clickid',
  's_cid',
  'wickedid',
  'pk_campaign',
  'pk_kwd',
  'piwik_campaign',
  'piwik_kwd',
  'mtm_campaign',
  'mtm_source',
  'mtm_medium',
  'mtm_content',
  'mtm_cid',
  'mtm_group',
  'mtm_placement',
]);

export function isTrackingParam(name: string): boolean {
  const key = name.trim().toLowerCase();
  return key.startsWith('utm_') || TRACKING_PARAMS.has(key);
}

/**
 * Removes campaign and click identifiers from a web URL. Non-web schemes and
 * unparseable input pass through untouched so navigation is never blocked by
 * a cleanup failure.
 */
export function stripTrackingParams(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return raw;
  if (!url.search) return raw;

  let removed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (!isTrackingParam(key)) continue;
    url.searchParams.delete(key);
    removed = true;
  }

  return removed ? url.toString() : raw;
}
