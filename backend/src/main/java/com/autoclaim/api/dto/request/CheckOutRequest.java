package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.util.UUID;

@Builder
@Schema(description = "Request payload for vehicle check-out")
public record CheckOutRequest(
        @Schema(description = "UUID of the active booking", example = "123e4567-e89b-12d3-a456-426614174000")
        @NotNull(message = "Booking ID is required")
        UUID bookingId
) {
}
