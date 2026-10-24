import { stripTrackingParams } from '../shared/privacy';

/** Picks the first http(s) URL from launcher arguments. */
export function findOpenUrl(argv: string[]): string | null {
  for (const argument of argv) {
    if (!/^https?:\/\//i.test(argument)) continue;
    try {
      return stripTrackingParams(new URL(argument).toString());
    } catch {
      // Not a URL despite the prefix; keep looking.
    }
  }
  return null;
}
