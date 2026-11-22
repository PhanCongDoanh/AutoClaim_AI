package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.VehicleStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vehicle card data. The rental fields ({@code activeBookingId} … {@code checkInAt}) are only filled for
 * RENTED vehicles that have an ACTIVE booking; they are null otherwise. The maintenance fields
 * ({@code lastCheckOutSessionId} … {@code maintenanceNotes}) are only filled for MAINTENANCE vehicles.
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
        /*
         * Maintenance fields: only filled for MAINTENANCE vehicles in GET /api/vehicles?status=MAINTENANCE, from the
         * latest COMPLETED booking (the rental that sent the vehicle to maintenance). All null when there is none.
         */
        /** CHECK_OUT session of that booking; null if it has none. */
        UUID lastCheckOutSessionId,
        /**
         * When the vehicle entered maintenance = {@code bookings.updated_at} of that booking (last written when the
         * check-out was completed). Non-null exactly when such a booking exists, i.e. maintenance notes can be saved.
         */
        LocalDateTime maintenanceSince,
        String lastRenterName,
        /** Damages of the check-out session not rejected by staff; null without a session. */
        Integer damageCount,
        /** Highest-confidence damage, e.g. "Trầy xước · Cản trước"; null when there is none. */
        String damageSummary,
        /** {@code bookings.maintenance_notes} of that booking, if already entered. */
        String maintenanceNotes,
        /**
         * Only set by PATCH complete-maintenance: true when notes were saved, false when notes were sent but the
         * vehicle has no COMPLETED booking to store them on, null when no notes were sent.
         */
        Boolean notesSaved,
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
