export interface CosmeticRule {
  selector: string;
  /** Comma-separated domains; `~domain` excludes. Undefined means every site. */
  domain?: string;
  isRegexSelect: boolean;
}

/**
 * Turns the element-hiding rules that apply to one host into a single CSS
 * block. Lists carry thousands of `##` rules, so only matches are emitted.
 */
export function cosmeticCssForHost(rules: CosmeticRule[], host: string): string {
  if (!host) return '';
  const normalized = host.toLowerCase();
  const selectors: string[] = [];

  for (const rule of rules) {
    if (rule.isRegexSelect) continue;
    if (rule.domain) {
      let included = false;
      let excluded = false;
      for (const part of rule.domain.split(',')) {
        const entry = part.trim().toLowerCase();
        if (!entry) continue;
        const bare = entry.replace(/^~/, '');
        const matches = normalized === bare || normalized.endsWith(`.${bare}`);
        if (!matches) continue;
        if (entry.startsWith('~')) excluded = true;
        else included = true;
      }
      if (!included || excluded) continue;
    }
    selectors.push(rule.selector);
  }

  return selectors.length ? `${selectors.join(',\n')}{display:none!important}` : '';
}
