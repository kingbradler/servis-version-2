import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("names SERVIS and points to logo icons", () => {
    const data = manifest();
    expect(data.name).toBe("SERVIS");
    expect(data.short_name).toBe("SERVIS");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    const srcs = (data.icons ?? []).map((icon) => icon.src);
    expect(srcs).toContain("/icons/icon-192.png");
    expect(srcs).toContain("/icons/icon-512.png");
    expect(srcs).toContain("/icons/icon-512-maskable.png");
  });
});
