import { apiRequest } from "./client";
import type { GenerateResponse, JobResponse } from "./types";

export function createJob(url: string): Promise<GenerateResponse> {
  return apiRequest<GenerateResponse>(
    "/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
    15_000,
  );
}

export function getJob(id: string): Promise<JobResponse> {
  return apiRequest<JobResponse>(`/jobs/${id}`, {}, 10_000);
}
