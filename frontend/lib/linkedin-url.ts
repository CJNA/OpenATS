/**
 * The same rule as the API's normalizeLinkedinUrl (backend/src/modules/candidate/linkedin-url.ts),
 * so a form can say what is wrong before sending. Keep the two the same; the API decides.
 *
 * A candidate's LinkedIn profile link, as stored: always https on linkedin.com (or one of its
 * subdomains), with no query string or fragment. Anything else is refused, so the candidate page
 * can render the stored value as a link without opening a door to another site or to `javascript:`.
 *
 * Accepts what people paste: with or without the scheme, `www.` or a country subdomain, and a
 * trailing slash. Returns null when the text is not a LinkedIn link.
 */
export function normalizeLinkedinUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  const path = url.pathname.replace(/\/+$/, "");
  if (!path) return null;
  return `https://${host}${path}`;
}
