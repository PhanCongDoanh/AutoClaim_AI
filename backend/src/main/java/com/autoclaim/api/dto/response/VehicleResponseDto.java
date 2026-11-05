package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.VehicleStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
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
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static VehicleResponseDto fromEntity(Vehicle vehicle) {
        return fromEntity(vehicle, null, null, null, null);
    }

    public static VehicleResponseDto fromEntity(
            Vehicle vehicle,
            UUID activeBookingId,
            String renterName,
            String renterPhone,
            UUID checkInSessionId) {
        return VehicleResponseDto.builder()
                .vehicleId(vehicle.getVehicleId())
                .licensePlate(vehicle.getLicensePlate())
                .model(vehicle.getModel())
                .seats(vehicle.getSeats())
                .status(vehicle.getStatus())
                .avatarUrl(vehicle.getAvatarUrl())
                .activeBookingId(activeBookingId)
                .renterName(renterName)
                .renterPhone(renterPhone)
                .checkInSessionId(checkInSessionId)
                .createdAt(vehicle.getCreatedAt())
                .updatedAt(vehicle.getUpdatedAt())
                .build();
    }
}
