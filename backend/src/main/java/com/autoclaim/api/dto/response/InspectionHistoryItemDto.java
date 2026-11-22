package com.autoclaim.api.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

/** One returned rental in GET /api/inspections/history (a COMPLETED booking with its CHECK_OUT session). */
@Builder
public record InspectionHistoryItemDto(
        UUID checkOutSessionId,
        UUID bookingId,
        String model,
        String licensePlate,
        String avatarUrl,
        String renterName,
        String renterPhone,
        /** created_at of the booking's latest CHECK_IN session; null if it has none. */
        LocalDateTime checkInAt,
        /** created_at of the CHECK_OUT session. */
        LocalDateTime checkOutAt,
        /** Damages not rejected by staff (final result after review). */
        int damageCount,
        /** Detections rejected by staff as AI mistakes. */
        int overriddenCount,
        /** DAMAGED when damageCount > 0, else CLEAN. */
        String result
) {
}
