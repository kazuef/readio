import { initialState } from "@/state/appState";
import { reducer } from "@/state/reducer";

describe("app reducer", () => {
  it("moves from submit to processing", () => {
    const submitting = reducer(initialState, {
      type: "SUBMIT",
      url: "https://example.com",
    });
    expect(reducer(submitting, { type: "ACCEPTED", jobId: "job" }).phase).toBe(
      "processing",
    );
  });
  it("keeps the playable job details", () => {
    const result = reducer(initialState, {
      type: "JOB_UPDATED",
      job: {
        id: "job",
        status: "ready",
        title: "記事",
        source_url: "https://example.com",
        audio_url: "/audio/job",
        duration_seconds: 10,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        expires_at: "2026-01-02T00:00:00Z",
      },
    });
    expect(result).toMatchObject({
      phase: "ready",
      title: "記事",
      audioUrl: "/audio/job",
    });
  });
});
