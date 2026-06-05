// ============================================================================
// AI Music Studio — generation analytics helpers.
//
// SCOPE (TASK 004 — architecture only): these helpers compute progress from
// whatever batch/job rows exist today. With no jobs yet they return zeroed /
// mocked-but-consistent values, ready for the future execution layer.
// ============================================================================

import type {
  BatchProgress,
  GenerationBatchRow,
  GenerationJobRow,
  JobProgress,
  StageStatus,
} from "./types";

/** Completion rate (0–100) for a batch, guarding against divide-by-zero. */
export function calculateCompletionRate(
  total: number,
  completed: number,
): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

/** Derive a progress summary from a batch row. */
export function getBatchProgress(
  batch: GenerationBatchRow | null,
): BatchProgress {
  if (!batch) {
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      pendingJobs: 0,
      completionRate: 0,
    };
  }

  const pendingJobs = Math.max(
    batch.total_jobs - batch.completed_jobs - batch.failed_jobs,
    0,
  );

  return {
    totalJobs: batch.total_jobs,
    completedJobs: batch.completed_jobs,
    failedJobs: batch.failed_jobs,
    pendingJobs,
    completionRate: calculateCompletionRate(
      batch.total_jobs,
      batch.completed_jobs,
    ),
  };
}

const STAGE_WEIGHT: Record<StageStatus, number> = {
  pending: 0,
  processing: 0.5,
  completed: 1,
  failed: 0,
};

/** Derive per-job progress across the lyrics + music stages. */
export function getJobProgress(job: GenerationJobRow | null): JobProgress {
  const lyricsStatus = (job?.lyrics_status ?? "pending") as StageStatus;
  const musicStatus = (job?.music_status ?? "pending") as StageStatus;

  const stageCompletion = Math.round(
    ((STAGE_WEIGHT[lyricsStatus] + STAGE_WEIGHT[musicStatus]) / 2) * 100,
  );

  return { lyricsStatus, musicStatus, stageCompletion };
}
