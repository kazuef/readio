import type { ProcessingStage } from "@/api/types";
import type { UserFacingError } from "@/utils/errors";

export type AppPhase = "idle" | "submitting" | "processing" | "ready" | "failed";

export type AppState = {
  phase: AppPhase;
  inputUrl: string;
  jobId: string | null;
  stage: ProcessingStage | null;
  title: string | null;
  sourceUrl: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  error: UserFacingError | null;
};

export const initialState: AppState = {
  phase: "idle", inputUrl: "", jobId: null, stage: null, title: null,
  sourceUrl: null, audioUrl: null, durationSeconds: null, error: null
};
