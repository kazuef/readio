import { validateArticleUrl } from "@/utils/url";

describe("validateArticleUrl", () => {
  it("rejects empty and non-http URLs", () => {
    expect(validateArticleUrl(" ").valid).toBe(false);
    expect(validateArticleUrl("ftp://example.com").valid).toBe(false);
  });
  it("accepts an HTTPS article URL", () => {
    expect(validateArticleUrl(" https://example.com/article ")).toEqual({ valid: true, value: "https://example.com/article" });
  });
});
