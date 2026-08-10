export type UrlValidation =
  { valid: true; value: string } | { valid: false; message: string };

export function validateArticleUrl(input: string): UrlValidation {
  const value = input.trim();
  if (!value) return { valid: false, message: "記事URLを入力してください。" };
  if (value.length > 2048)
    return { valid: false, message: "URLが長すぎます。" };
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname)
      throw new Error();
    return { valid: true, value };
  } catch {
    return {
      valid: false,
      message: "httpまたはhttpsで始まるURLを入力してください。",
    };
  }
}
