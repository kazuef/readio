import * as Crypto from "expo-crypto";

import type { ApiErrorBody } from "./types";

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const accessKey = process.env.EXPO_PUBLIC_MVP_ACCESS_KEY ?? "";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export function absoluteApiUrl(path: string): string {
  return path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(absoluteApiUrl(path), {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-MVP-Key": accessKey,
        "X-Request-ID": Crypto.randomUUID(),
        ...options.headers
      }
    });
    const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
    if (!response.ok) {
      const error = body as ApiErrorBody | null;
      throw new ApiError(error?.error?.code ?? "UNEXPECTED_RESPONSE", error?.error?.message ?? "応答を確認できませんでした。", response.status);
    }
    if (!body) throw new ApiError("UNEXPECTED_RESPONSE", "応答を確認できませんでした。", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApiError("NETWORK_TIMEOUT", "通信がタイムアウトしました。", 0);
    throw new ApiError("NETWORK_ERROR", "サーバーに接続できませんでした。", 0);
  } finally {
    clearTimeout(timer);
  }
}
