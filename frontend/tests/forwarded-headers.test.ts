import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getApiToken: vi.fn() }));

import { pickForwardedHeaders } from "@/lib/server-fetch";

describe("pickForwardedHeaders", () => {
  it("passes on who the visitor is, but never Cloudflare's own header", () => {
    const incoming = new Headers({
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.7",
      "cf-connecting-ip": "203.0.113.7",
      cookie: "session=secret",
    });

    expect(pickForwardedHeaders(incoming)).toEqual({
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.7",
    });
  });
});
