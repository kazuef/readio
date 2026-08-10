export type ProcessingStage =
  "queued" | "fetching" | "extracting" | "generating_audio";
export type JobStatus = ProcessingStage | "ready" | "failed";

export type ApiErrorBody = {
  error: { code: string; message: string; request_id?: string };
};

export type GenerateResponse = {
  id: string;
  status: "queued";
  status_url: string;
};

export type JobResponse = {
  id: string;
  status: JobStatus;
  title: string | null;
  source_url?: string;
  audio_url?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  error?: { code: string; message: string };
};
