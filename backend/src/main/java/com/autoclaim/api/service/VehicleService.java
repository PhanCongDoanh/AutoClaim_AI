package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CompleteMaintenanceRequest;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.ConflictException;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.BookingRepository;
import com.autoclaim.api.repository.DamageDetectionRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.autoclaim.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VehicleService {

    /** Max length of {@code maintenanceNotes} accepted by complete-maintenance. */
    public static final int MAINTENANCE_NOTES_MAX_LENGTH = 1000;

    private static final Map<VehicleStatus, String> STATUS_LABELS = Map.of(
            VehicleStatus.AVAILABLE, "Sẵn sàng",
            VehicleStatus.RENTED, "Đang thuê",
            VehicleStatus.MAINTENANCE, "Bảo trì"
    );

    private final VehicleRepository vehicleRepository;
    private final BookingRepository bookingRepository;
    private final InspectionSessionRepository inspectionSessionRepository;
    private final DamageDetectionRepository damageDetectionRepository;
    private final com.autoclaim.api.repository.VehicleReferenceImageRepository vehicleReferenceImageRepository;

    public Map<String, String> getReferenceImages(UUID vehicleId) {
        if (!vehicleRepository.existsById(vehicleId)) {
            throw new ResourceNotFoundException("Vehicle", vehicleId);
        }
        var refs = vehicleReferenceImageRepository.findByVehicle_VehicleId(vehicleId);
        return refs.stream()
                .collect(Collectors.toMap(
                        ref -> ref.getAngleCode().name(),
                        com.autoclaim.api.entity.VehicleReferenceImage::getImageUrl,
                        (v1, v2) -> v1
                ));
    }

    public List<VehicleResponseDto> getVehicles(VehicleStatus status, String search) {
        List<Vehicle> vehicles = StringUtils.hasText(search)
                ? vehicleRepository.findByStatusAndModelContainingIgnoreCaseAndIsDeletedFalse(status, search.trim())
                : vehicleRepository.findByStatusAndIsDeletedFalse(status);

        if (status == VehicleStatus.MAINTENANCE) {
            return toMaintenanceDtos(vehicles);
        }
        return vehicles.stream()
                .map(this::toVehicleResponseDto)
                .toList();
    }

    /**
     * MAINTENANCE → AVAILABLE. Notes are stored on the latest COMPLETED booking (the rental that sent the vehicle to
     * maintenance); that booking's status is left unchanged. Without such a booking (seed data, status set by hand)
     * the vehicle is still released and the notes are dropped ({@code notesSaved = false}).
     */
    @Transactional
    public VehicleResponseDto completeMaintenance(UUID vehicleId, CompleteMaintenanceRequest request) {
        Vehicle vehicle = vehicleRepository.findByVehicleIdAndIsDeletedFalse(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", vehicleId));

        if (vehicle.getStatus() != VehicleStatus.MAINTENANCE) {
            throw new ConflictException("Xe %s không ở trạng thái Bảo trì (trạng thái hiện tại: %s)."
                    .formatted(vehicle.getLicensePlate(),
                            STATUS_LABELS.getOrDefault(vehicle.getStatus(), String.valueOf(vehicle.getStatus()))));
        }

        String notes = request != null && StringUtils.hasText(request.maintenanceNotes())
                ? request.maintenanceNotes().trim()
                : null;
        if (notes != null && notes.length() > MAINTENANCE_NOTES_MAX_LENGTH) {
            throw new BadRequestException("Ghi chú sửa chữa tối đa %d ký tự (hiện có %d)."
                    .formatted(MAINTENANCE_NOTES_MAX_LENGTH, notes.length()));
        }

        Boolean notesSaved = null;
        if (notes != null) {
            notesSaved = bookingRepository
                    .findFirstByVehicle_VehicleIdAndStatusOrderByCreatedAtDesc(vehicleId, BookingStatus.COMPLETED)
                    .map(booking -> {
                        booking.setMaintenanceNotes(notes);
                        bookingRepository.save(booking);
                        return true;
                    })
                    .orElse(false);
        }

        vehicle.setStatus(VehicleStatus.AVAILABLE);
        return toVehicleResponseDto(vehicleRepository.saveAndFlush(vehicle)).toBuilder()
                .notesSaved(notesSaved)
                .build();
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

    /**
     * Adds the maintenance fields from each vehicle's latest COMPLETED booking, that booking's CHECK_OUT session and
     * the session's active damages — three queries for the whole list (no N+1).
     */
    private List<VehicleResponseDto> toMaintenanceDtos(List<Vehicle> vehicles) {
        if (vehicles.isEmpty()) {
            return List.of();
        }

        List<UUID> vehicleIds = vehicles.stream().map(Vehicle::getVehicleId).toList();
        Map<UUID, Booking> bookingByVehicle = new HashMap<>();
        for (Booking booking : bookingRepository.findLatestByVehicleIdsAndStatus(vehicleIds, BookingStatus.COMPLETED)) {
            bookingByVehicle.putIfAbsent(booking.getVehicle().getVehicleId(), booking);
        }

        Map<UUID, InspectionSession> sessionByBooking = new HashMap<>();
        if (!bookingByVehicle.isEmpty()) {
            List<UUID> bookingIds = bookingByVehicle.values().stream().map(Booking::getBookingId).toList();
            for (InspectionSession session : inspectionSessionRepository
                    .findByBooking_BookingIdInAndSessionType(bookingIds, SessionType.CHECK_OUT)) {
                sessionByBooking.merge(session.getBooking().getBookingId(), session, VehicleService::newerSession);
            }
        }

        Map<UUID, List<DamageDetection>> damagesBySession = sessionByBooking.isEmpty()
                ? Map.of()
                : damageDetectionRepository
                        .findActiveBySessionIds(sessionByBooking.values().stream()
                                .map(InspectionSession::getSessionId)
                                .toList())
                        .stream()
                        .collect(Collectors.groupingBy(damage -> damage.getImage().getSession().getSessionId()));

        return vehicles.stream()
                .map(vehicle -> {
                    VehicleResponseDto base = VehicleResponseDto.fromEntity(vehicle);
                    Booking booking = bookingByVehicle.get(vehicle.getVehicleId());
                    if (booking == null) {
                        return base;
                    }
                    InspectionSession session = sessionByBooking.get(booking.getBookingId());
                    List<DamageDetection> damages = session == null
                            ? List.of()
                            : damagesBySession.getOrDefault(session.getSessionId(), List.of());
                    Renter renter = booking.getRenter();
                    return base.toBuilder()
                            .lastCheckOutSessionId(session != null ? session.getSessionId() : null)
                            .maintenanceSince(booking.getUpdatedAt())
                            .lastRenterName(renter != null ? renter.getName() : null)
                            .damageCount(session != null ? damages.size() : null)
                            .damageSummary(summarizeDamages(damages))
                            .maintenanceNotes(booking.getMaintenanceNotes())
                            .build();
                })
                .toList();
    }

    private static InspectionSession newerSession(InspectionSession a, InspectionSession b) {
        if (a.getCreatedAt() == null) {
            return b;
        }
        return b.getCreatedAt() != null && b.getCreatedAt().isAfter(a.getCreatedAt()) ? b : a;
    }

    /** "Trầy xước · Cản trước" for the highest-confidence damage, or null when there is none. */
    private static String summarizeDamages(List<DamageDetection> damages) {
        return damages.stream()
                .max(Comparator.comparing(DamageDetection::getConfidenceScore,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(damage -> {
                    String type = InspectionLabels.damageLabel(damage.getDamageType());
                    return StringUtils.hasText(damage.getPartName())
                            ? type + " · " + damage.getPartName().trim()
                            : type;
                })
                .orElse(null);
    }
}
