package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CompleteMaintenanceRequest;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.BookingRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.autoclaim.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final BookingRepository bookingRepository;
    private final InspectionSessionRepository inspectionSessionRepository;

    public List<VehicleResponseDto> getVehicles(VehicleStatus status, String search) {
        List<Vehicle> vehicles = StringUtils.hasText(search)
                ? vehicleRepository.findByStatusAndModelContainingIgnoreCaseAndIsDeletedFalse(status, search.trim())
                : vehicleRepository.findByStatusAndIsDeletedFalse(status);

        return vehicles.stream()
                .map(this::toVehicleResponseDto)
                .toList();
    }

    @Transactional
    public VehicleResponseDto completeMaintenance(UUID vehicleId, CompleteMaintenanceRequest request) {
        Vehicle vehicle = vehicleRepository.findByVehicleIdAndIsDeletedFalse(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", vehicleId));

        if (vehicle.getStatus() != VehicleStatus.MAINTENANCE) {
            throw new BadRequestException(
                    "Vehicle %s is not under maintenance (current status: %s)"
                            .formatted(vehicle.getLicensePlate(), vehicle.getStatus()));
        }

        if (request != null && StringUtils.hasText(request.maintenanceNotes())) {
            bookingRepository.findFirstByVehicle_VehicleIdOrderByCreatedAtDesc(vehicleId)
                    .ifPresent(booking -> {
                        booking.setMaintenanceNotes(request.maintenanceNotes().trim());
                        booking.setStatus(BookingStatus.COMPLETED);
                        bookingRepository.save(booking);
                    });
        }

        vehicle.setStatus(VehicleStatus.AVAILABLE);
        return toVehicleResponseDto(vehicleRepository.saveAndFlush(vehicle));
    }

    /** Number of non-deleted vehicles per status; every status is present (0 when none). */
    public Map<VehicleStatus, Long> countByStatus() {
        Map<VehicleStatus, Long> counts = new EnumMap<>(VehicleStatus.class);
        for (VehicleStatus status : VehicleStatus.values()) {
            counts.put(status, 0L);
        }
        for (Object[] row : vehicleRepository.countByStatus()) {
            if (row[0] instanceof VehicleStatus status && row[1] instanceof Number count) {
                counts.put(status, count.longValue());
            }
        }
        return counts;
    }

    public VehicleResponseDto toVehicleResponseDto(Vehicle vehicle) {
        VehicleResponseDto base = VehicleResponseDto.fromEntity(vehicle);
        if (vehicle.getStatus() != VehicleStatus.RENTED) {
            return base;
        }

        return bookingRepository.findFirstByVehicle_VehicleIdAndStatusOrderByCreatedAtDesc(
                        vehicle.getVehicleId(), BookingStatus.ACTIVE)
                .map(booking -> {
                    Renter renter = booking.getRenter();
                    InspectionSession checkInSession = inspectionSessionRepository
                            .findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
                                    booking.getBookingId(), SessionType.CHECK_IN)
                            .orElse(null);

                    return base.toBuilder()
                            .activeBookingId(booking.getBookingId())
                            .renterName(renter != null ? renter.getName() : null)
                            .renterPhone(renter != null ? renter.getPhoneNumber() : null)
                            .checkInSessionId(checkInSession != null ? checkInSession.getSessionId() : null)
                            .checkInAt(checkInSession != null ? checkInSession.getCreatedAt() : null)
                            .expectedReturnAt(booking.getExpectedReturnAt())
                            .build();
                })
                .orElse(base);
    }
}
