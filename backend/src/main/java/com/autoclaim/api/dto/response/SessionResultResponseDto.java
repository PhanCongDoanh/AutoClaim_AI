package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Everything the check-out screens (AI progress, results, report) need, so they can be rebuilt after a
 * page reload even once the booking is COMPLETED.
 */
@Builder
public record SessionResultResponseDto(
        UUID sessionId,
        SessionType sessionType,
        /** PENDING | PROCESSING | DONE | FAILED for CHECK_OUT (null in DB is reported as FAILED); null for CHECK_IN. */
        String aiStatus,
        /** When this session was created (the check-out time for a CHECK_OUT session). */
        LocalDateTime createdAt,
        UUID bookingId,
        BookingStatus bookingStatus,
        LocalDateTime expectedReturnAt,
        /** Latest CHECK_IN session of the same booking (equals {@code sessionId} for a CHECK_IN session). */
        UUID checkInSessionId,
        LocalDateTime checkInAt,
        UUID vehicleId,
        /** Vehicle fields only (rental fields are null); status is the vehicle's current status. */
        VehicleResponseDto vehicle,
        String renterName,
        String renterPhone,
        /** Staff member who created this session. */
        String staffName,
        List<ImageResultDto> images
) {
}
