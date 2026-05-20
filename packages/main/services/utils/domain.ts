/**
 * Simplified registrable domain (eTLD+1) helper.
 * Strips known short SLDs to extract the effective TLD+1.
 * This is a simplified substitute for the full Public Suffix List.
 */

const KNOWN_SLDS = new Set([
  'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in', 'co.id',
  'com.au', 'com.br', 'com.cn', 'com.mx', 'com.tw', 'com.sg', 'com.ar',
  'org.uk', 'gov.uk', 'ac.uk', 'net.au', 'org.au',
  'ne.jp', 'or.jp', 'go.id', 'web.id',
]);

/**
 * Returns the registrable domain (eTLD+1) for a given hostname.
 * e.g. "www.google.com" -> "google.com", "www.news.bbc.co.uk" -> "bbc.co.uk"
 */
export function getRegistrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length < 2) return hostname;

  // Check if the last two parts form a known SLD (e.g., co.uk)
  if (parts.length >= 3) {
    const candidateSLD = parts.slice(-2).join('.');
    if (KNOWN_SLDS.has(candidateSLD)) {
      // Return the label before the SLD + SLD
      return parts.slice(-3).join('.');
    }
  }

  // Default: last two labels
  return parts.slice(-2).join('.');
}
