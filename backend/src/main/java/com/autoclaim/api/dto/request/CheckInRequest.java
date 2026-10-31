package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
@Schema(description = "Request payload for vehicle check-in")
public record CheckInRequest(
        @Schema(description = "Full name of the renter", example = "Nguyen Van A")
        @NotBlank(message = "Renter name is required")
        String renterName,

        @Schema(description = "Phone number of the renter", example = "0901234567")
        @NotBlank(message = "Renter phone is required")
        String renterPhone,

        @Schema(description = "UUID of the vehicle being rented", example = "123e4567-e89b-12d3-a456-426614174000")
        @NotNull(message = "Vehicle ID is required")
        UUID vehicleId,

        @Schema(description = "Expected return date and time", example = "2026-11-05T18:00:00")
        LocalDateTime expectedReturnAt,

        @Schema(description = "Notes recorded at vehicle handover", example = "Full fuel tank, minor dust on rear bumper")
        String handoverNotes
) {
}
