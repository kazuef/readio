import { AppState as NativeAppState } from "react-native";
import { useEffect, useRef } from "react";

import { ApiError } from "@/api/client";
import { getJob } from "@/api/jobs";
import type { JobResponse } from "@/api/types";
import type { UserFacingError } from "@/utils/errors";
import { toUserFacingError } from "@/utils/errors";

type Callbacks = {
  onUpdate: (job: JobResponse) => void;
  onFailure: (error: UserFacingError) => void;
};

export function useGenerationJob(
  jobId: string | null,
  active: boolean,
  callbacks: Callbacks,
): void {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!jobId || !active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= 300_000) {
        callbacksRef.current.onFailure({
          code: "JOB_TIMEOUT",
          message: "音声生成に時間がかかりすぎました。",
          canRetry: true,
        });
        return;
      }
      try {
        const job = await getJob(jobId);
        if (cancelled) return;
        failures = 0;
        if (job.status === "failed") {
          const code = job.error?.code ?? "INTERNAL_ERROR";
          const cannotRetry = [
            "INVALID_URL",
            "URL_NOT_ALLOWED",
            "ACCESS_DENIED",
            "ARTICLE_EXTRACTION_FAILED",
            "ARTICLE_TOO_LARGE",
          ].includes(code);
          callbacksRef.current.onFailure({
            code,
            message: job.error?.message ?? "音声を生成できませんでした。",
            canRetry: !cannotRetry,
          });
          return;
        }
        callbacksRef.current.onUpdate(job);
        if (job.status !== "ready") timer = setTimeout(poll, 2_000);
      } catch (error) {
        if (cancelled) return;
        failures += 1;
        if (
          failures > 3 ||
          (error instanceof ApiError && [401, 403, 404].includes(error.status))
        ) {
          callbacksRef.current.onFailure(toUserFacingError(error));
          return;
        }
        timer = setTimeout(poll, [2_000, 4_000, 8_000][failures - 1]);
      }
    };

    void poll();
    const subscription = NativeAppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (timer) clearTimeout(timer);
        void poll();
      }
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [active, jobId]);
}
