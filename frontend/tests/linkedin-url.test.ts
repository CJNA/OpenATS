import { describe, it, expect } from "vitest";
import { normalizeLinkedinUrl } from "@/lib/linkedin-url";

// The same cases as the API's test (backend/tests/unit/linkedin-url.test.ts): the two must agree.
describe("normalizeLinkedinUrl (form check)", () => {
  it("accepts what people paste and stores one form", () => {
    expect(normalizeLinkedinUrl("linkedin.com/in/jane/")).toBe("https://linkedin.com/in/jane");
    expect(normalizeLinkedinUrl("https://www.linkedin.com/in/jane?trk=x")).toBe("https://www.linkedin.com/in/jane");
  });

  it("refuses other sites and schemes", () => {
    for (const bad of ["jane", "javascript:alert(1)", "https://linkedin.com.evil.com/in/x", "https://www.linkedin.com/"]) {
      expect(normalizeLinkedinUrl(bad), bad).toBeNull();
    }
  });
});
