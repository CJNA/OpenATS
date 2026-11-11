import { describe, it, expect } from "vitest";
import { normalizeLinkedinUrl } from "../../src/modules/candidate/linkedin-url";

describe("normalizeLinkedinUrl", () => {
  it("keeps a full profile link, minus the trailing slash", () => {
    expect(normalizeLinkedinUrl("https://www.linkedin.com/in/jane-doe/")).toBe(
      "https://www.linkedin.com/in/jane-doe",
    );
  });

  it("accepts what people paste: no scheme, http, country subdomains, spaces", () => {
    expect(normalizeLinkedinUrl("linkedin.com/in/jane")).toBe("https://linkedin.com/in/jane");
    expect(normalizeLinkedinUrl("  http://uk.linkedin.com/in/jane ")).toBe("https://uk.linkedin.com/in/jane");
    expect(normalizeLinkedinUrl("WWW.LinkedIn.com/in/Jane")).toBe("https://www.linkedin.com/in/Jane");
  });

  it("drops tracking query strings and fragments", () => {
    expect(normalizeLinkedinUrl("https://www.linkedin.com/in/jane?utm_source=share#about")).toBe(
      "https://www.linkedin.com/in/jane",
    );
  });

  it("refuses anything that is not a LinkedIn page", () => {
    for (const bad of [
      "",
      "   ",
      "jane doe",
      "javascript:alert(1)",
      "https://evil.com/linkedin.com/in/jane",
      "https://linkedin.com.evil.com/in/jane",
      "https://notlinkedin.com/in/jane",
      "ftp://linkedin.com/in/jane",
      "https://user:pw@linkedin.com/in/jane",
      "https://linkedin.com:8443/in/jane",
      "https://www.linkedin.com/",
    ]) {
      expect(normalizeLinkedinUrl(bad), bad).toBeNull();
    }
  });
});
