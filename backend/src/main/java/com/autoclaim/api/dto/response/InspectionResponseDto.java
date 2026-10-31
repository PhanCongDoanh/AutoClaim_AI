package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record InspectionResponseDto(
        UUID sessionId,
        UUID bookingId,
        UUID vehicleId,
        SessionType sessionType,
        BookingStatus bookingStatus,
        VehicleStatus vehicleStatus,
        int imageCount,
        LocalDateTime createdAt,
        String message
) {
}
