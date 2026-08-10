import { ApiError } from "@/api/client";

export type UserFacingError = { code: string; message: string; canRetry: boolean };

const NON_RETRYABLE = new Set(["INVALID_URL", "URL_NOT_ALLOWED", "ACCESS_DENIED", "ARTICLE_EXTRACTION_FAILED", "ARTICLE_TOO_LARGE"]);

export function toUserFacingError(error: unknown): UserFacingError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message, canRetry: !NON_RETRYABLE.has(error.code) };
  }
  return { code: "UNEXPECTED", message: "エラーが発生しました。時間をおいてお試しください。", canRetry: true };
}
