package com.autoclaim.api.dto.response;

import lombok.Builder;

import java.util.List;
import java.util.UUID;

/**
 * Progress of the AI damage detection for a CHECK_OUT session
 * ({@code GET /api/inspections/{sessionId}/ai-progress}).
 *
 * <p>Live values come from the AI service. When it does not know the session (restarted, 404) or is
 * unreachable, only {@code status} from the database is known: {@code progress} is 100 for DONE and 0
 * otherwise, and the per-angle fields are empty.
 */
@Builder
public record AiProgressDto(
        UUID sessionId,
        /** PENDING | PROCESSING | DONE | FAILED. */
        String status,
        /** 0..100. */
        int progress,
        /** Angle being analysed, e.g. "ANGLE_5"; null when idle or finished. */
        String currentAngle,
        /** Angles already analysed, in processing order. */
        List<String> completedAngles,
        /** Number of angles the AI will analyse (8), or null when unknown. */
        Integer totalAngles,
        /** New damages inserted by the AI; only set when the AI reports DONE. */
        Integer newDamages,
        /** Error message from the AI service when FAILED, if known. */
        String error,
        /** True when the values came from the live AI service, false when derived from the database only. */
        boolean live
) {
}
