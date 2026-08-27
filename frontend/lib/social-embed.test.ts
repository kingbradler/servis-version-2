import { describe, expect, it } from "vitest";

import {
  parseInstagramCode,
  parseTikTokVideoId,
  resolveProductVideoEmbed,
} from "@/lib/social-embed";

describe("social-embed", () => {
  it("parses TikTok video id", () => {
    expect(
      parseTikTokVideoId(
        "https://www.tiktok.com/@u/video/1234567890123456789"
      )
    ).toBe("1234567890123456789");
  });

  it("parses Instagram reel code", () => {
    expect(parseInstagramCode("https://www.instagram.com/reel/AbCdEf123/")).toBe(
      "AbCdEf123"
    );
  });

  it("builds TikTok embed src", () => {
    const embed = resolveProductVideoEmbed(
      "https://www.tiktok.com/@u/video/1234567890123456789"
    );
    expect(embed?.network).toBe("tiktok");
    expect(embed?.embedSrc).toContain("1234567890123456789");
  });

  it("returns null for empty", () => {
    expect(resolveProductVideoEmbed("")).toBeNull();
  });
});
