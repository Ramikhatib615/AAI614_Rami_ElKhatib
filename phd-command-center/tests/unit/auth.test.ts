import { describe, expect, it } from "vitest";

import { isAllowedEmail } from "@/lib/allowlist";

const allowed = ["ramikhatib615@gmail.com"];

describe("isAllowedEmail", () => {
  it("accepts the allowlisted address regardless of case", () => {
    expect(isAllowedEmail("RamiKhatib615@Gmail.com", allowed)).toBe(true);
  });

  it("rejects anyone else", () => {
    expect(isAllowedEmail("someone@example.com", allowed)).toBe(false);
  });

  it("rejects a missing address, which is what GitHub returns when no email is readable", () => {
    expect(isAllowedEmail(null, allowed)).toBe(false);
    expect(isAllowedEmail(undefined, allowed)).toBe(false);
    expect(isAllowedEmail("", allowed)).toBe(false);
  });
});
