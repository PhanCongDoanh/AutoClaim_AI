package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.VehicleStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vehicle card data. The rental fields ({@code activeBookingId} … {@code checkInAt}) are only filled for
 * RENTED vehicles that have an ACTIVE booking; they are null otherwise.
 */
@Builder(toBuilder = true)
public record VehicleResponseDto(
        UUID vehicleId,
        String licensePlate,
        String model,
        Integer seats,
        VehicleStatus status,
        String avatarUrl,
        UUID activeBookingId,
        String renterName,
        String renterPhone,
        UUID checkInSessionId,
        /** When the vehicle was handed over (created_at of the CHECK_IN session). */
        LocalDateTime checkInAt,
        /** Agreed return time ({@code bookings.expected_return_at}); may be null for old bookings. */
        LocalDateTime expectedReturnAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /** Vehicle fields only; use {@link #toBuilder()} to add rental details. */
    public static VehicleResponseDto fromEntity(Vehicle vehicle) {
        return VehicleResponseDto.builder()
                .vehicleId(vehicle.getVehicleId())
                .licensePlate(vehicle.getLicensePlate())
                .model(vehicle.getModel())
                .seats(vehicle.getSeats())
                .status(vehicle.getStatus())
                .avatarUrl(vehicle.getAvatarUrl())
                .createdAt(vehicle.getCreatedAt())
                .updatedAt(vehicle.getUpdatedAt())
                .build();
    }
}
