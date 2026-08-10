import type { JobResponse, ProcessingStage } from "@/api/types";
import type { UserFacingError } from "@/utils/errors";
import type { AppState } from "./appState";

export type AppAction =
  | { type: "INPUT_CHANGED"; value: string }
  | { type: "SUBMIT"; url: string }
  | { type: "ACCEPTED"; jobId: string }
  | { type: "JOB_UPDATED"; job: JobResponse }
  | { type: "FAILED"; error: UserFacingError }
  | { type: "EDIT" }
  | { type: "NEW_URL" };

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "INPUT_CHANGED":
      return { ...state, inputUrl: action.value };
    case "SUBMIT":
      return {
        ...state,
        phase: "submitting",
        inputUrl: action.url,
        error: null,
      };
    case "ACCEPTED":
      return {
        ...state,
        phase: "processing",
        jobId: action.jobId,
        stage: "queued",
      };
    case "JOB_UPDATED": {
      const job = action.job;
      if (job.status === "ready")
        return {
          ...state,
          phase: "ready",
          title: job.title,
          sourceUrl: job.source_url ?? state.inputUrl,
          audioUrl: job.audio_url ?? null,
          durationSeconds: job.duration_seconds ?? null,
          stage: null,
        };
      if (job.status === "failed") return state;
      return {
        ...state,
        phase: "processing",
        stage: job.status as ProcessingStage,
        title: job.title ?? state.title,
      };
    }
    case "FAILED":
      return { ...state, phase: "failed", stage: null, error: action.error };
    case "EDIT":
      return { ...state, phase: "idle", jobId: null, stage: null, error: null };
    case "NEW_URL":
      return {
        ...state,
        phase: "idle",
        inputUrl: "",
        jobId: null,
        stage: null,
        title: null,
        sourceUrl: null,
        audioUrl: null,
        durationSeconds: null,
        error: null,
      };
  }
}
