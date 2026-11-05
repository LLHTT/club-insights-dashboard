import { describe, it, expect } from "vitest";
import { defaultRangeLabels } from "./time";

describe("defaultRangeLabels", () => {
  it("is the 4 weeks up to and including yesterday", () => {
    const now = new Date("2026-10-05T02:00:00Z"); // Mon 5 Oct 2026, 09:00 ICT
    expect(defaultRangeLabels(now)).toEqual({
      from: "2026-09-07",
      to: "2026-10-04",
    });
  });
});
