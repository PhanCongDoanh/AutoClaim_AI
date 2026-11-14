package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
import com.autoclaim.api.dto.response.AiProgressDto;
import com.autoclaim.api.dto.response.DamageDto;
import com.autoclaim.api.dto.response.ImageResultDto;
import com.autoclaim.api.dto.response.InspectionResponseDto;
import com.autoclaim.api.dto.response.SessionResultResponseDto;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionImage;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.AiStatus;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.ConflictException;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.BookingRepository;
import com.autoclaim.api.repository.DamageDetectionRepository;
import com.autoclaim.api.repository.InspectionImageRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.autoclaim.api.repository.RenterRepository;
import com.autoclaim.api.repository.UserRepository;
import com.autoclaim.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InspectionServiceImpl implements InspectionService {

    private static final String DEFAULT_STAFF_EMAIL = "staff@autoclaim.com";

    /** A PENDING/PROCESSING session older than this may be retried when the AI service has lost it. */
    private static final Duration AI_STUCK_AFTER = Duration.ofMinutes(2);

    private static final List<AngleCode> CHECK_IN_ANGLES = List.of(
            AngleCode.CCCD_FRONT,
            AngleCode.CCCD_BACK,
            AngleCode.ANGLE_1,
            AngleCode.ANGLE_2,
            AngleCode.ANGLE_3,
            AngleCode.ANGLE_4,
            AngleCode.ANGLE_5,
            AngleCode.ANGLE_6,
            AngleCode.ANGLE_7,
            AngleCode.ANGLE_8
    );

    private static final List<AngleCode> CHECK_OUT_ANGLES = List.of(
            AngleCode.ANGLE_1,
            AngleCode.ANGLE_2,
            AngleCode.ANGLE_3,
            AngleCode.ANGLE_4,
            AngleCode.ANGLE_5,
            AngleCode.ANGLE_6,
            AngleCode.ANGLE_7,
            AngleCode.ANGLE_8
    );

    private final VehicleRepository vehicleRepository;
    private final RenterRepository renterRepository;
    private final BookingRepository bookingRepository;
    private final InspectionSessionRepository inspectionSessionRepository;
    private final InspectionImageRepository inspectionImageRepository;
    private final DamageDetectionRepository damageDetectionRepository;
    private final UserRepository userRepository;
    private final S3StorageService s3StorageService;
    private final AiServiceClient aiServiceClient;
    private final AiStatusUpdater aiStatusUpdater;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InspectionResponseDto checkIn(CheckInRequest request, List<MultipartFile> images) {
        validateImages(images, CHECK_IN_ANGLES.size(), "Check-in");

        Vehicle vehicle = vehicleRepository.findByVehicleIdAndIsDeletedFalse(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", request.vehicleId()));

        if (vehicle.getStatus() != VehicleStatus.AVAILABLE) {
            throw new BadRequestException(
                    "Vehicle %s is not available for check-in (current status: %s)"
                            .formatted(vehicle.getLicensePlate(), vehicle.getStatus()));
        }

        User staff = resolveCurrentStaff();

        // a. Create a Renter and a Booking (status ACTIVE)
        Renter renter = Renter.builder()
                .name(request.renterName().trim())
                .phoneNumber(request.renterPhone() != null ? request.renterPhone().trim() : null)
                .build();
        renter = renterRepository.save(renter);

        Booking booking = Booking.builder()
                .vehicle(vehicle)
                .renter(renter)
                .createdBy(staff)
                .status(BookingStatus.ACTIVE)
                .expectedReturnAt(request.expectedReturnAt())
                .handoverNotes(StringUtils.hasText(request.handoverNotes()) ? request.handoverNotes().trim() : null)
                .build();
        booking = bookingRepository.save(booking);

        // b. Change Vehicle status to RENTED
        vehicle.setStatus(VehicleStatus.RENTED);
        vehicle = vehicleRepository.save(vehicle);

        // c. Create an InspectionSession with type CHECK_IN
        InspectionSession session = InspectionSession.builder()
                .booking(booking)
                .staff(staff)
                .sessionType(SessionType.CHECK_IN)
                .build();
        session = inspectionSessionRepository.saveAndFlush(session);

        // d. Upload the 10 MultipartFiles to S3 and save their URLs into inspection_images
        List<InspectionImage> savedImages = saveInspectionImages(session, images, CHECK_IN_ANGLES);

        return InspectionResponseDto.builder()
                .sessionId(session.getSessionId())
                .bookingId(booking.getBookingId())
                .vehicleId(vehicle.getVehicleId())
                .sessionType(session.getSessionType())
                .bookingStatus(booking.getStatus())
                .vehicleStatus(vehicle.getStatus())
                .imageCount(savedImages.size())
                .createdAt(session.getCreatedAt())
                .message("Check-in completed successfully")
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InspectionResponseDto checkOut(CheckOutRequest request, List<MultipartFile> images) {
        validateImages(images, CHECK_OUT_ANGLES.size(), "Check-out");

        // a. Lock the booking so two concurrent check-outs cannot both pass the checks below
        Booking booking = bookingRepository.findByIdForUpdate(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", request.bookingId()));

        // b. One check-out per booking: a repeated submit is sent to the existing session (before any upload)
        inspectionSessionRepository.findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
                        booking.getBookingId(), SessionType.CHECK_OUT)
                .ifPresent(existing -> {
                    throw new ConflictException(
                            "Xe này đã được gửi check-out trước đó. Đang chuyển tới phiên check-out hiện có.",
                            Map.of("sessionId", existing.getSessionId()));
                });

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new BadRequestException("Lượt thuê này đã kết thúc, không thể check-out.");
        }

        Vehicle vehicle = booking.getVehicle();
        if (vehicle.getStatus() != VehicleStatus.RENTED) {
            throw new BadRequestException(
                    "Xe %s không ở trạng thái Đang thuê nên không thể check-out.".formatted(vehicle.getLicensePlate()));
        }

        User staff = resolveCurrentStaff();

        // c. Create the CHECK_OUT session; the AI service moves it to PROCESSING / DONE / FAILED
        InspectionSession session = InspectionSession.builder()
                .booking(booking)
                .staff(staff)
                .sessionType(SessionType.CHECK_OUT)
                .aiStatus(AiStatus.PENDING)
                .build();
        session = inspectionSessionRepository.saveAndFlush(session);

        // d. Upload the 8 images to S3 (ANGLE_1 to ANGLE_8) and save their URLs
        List<InspectionImage> savedImages = saveInspectionImages(session, images, CHECK_OUT_ANGLES);

        // e. Trigger the AI only once the images are committed and visible to it
        triggerAiAfterCommit(session.getSessionId());

        return InspectionResponseDto.builder()
                .sessionId(session.getSessionId())
                .bookingId(booking.getBookingId())
                .vehicleId(vehicle.getVehicleId())
                .sessionType(session.getSessionType())
                .bookingStatus(booking.getStatus())
                .vehicleStatus(vehicle.getStatus())
                .imageCount(savedImages.size())
                .createdAt(session.getCreatedAt())
                .message("Check-out images saved successfully. AI analysis will start shortly.")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResultResponseDto getSessionResults(UUID sessionId) {
        InspectionSession session = findSession(sessionId);
        Booking booking = session.getBooking();
        Vehicle vehicle = booking.getVehicle();
        Renter renter = booking.getRenter();
        boolean isCheckOut = session.getSessionType() == SessionType.CHECK_OUT;

        InspectionSession checkInSession = isCheckOut
                ? inspectionSessionRepository.findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
                        booking.getBookingId(), SessionType.CHECK_IN).orElse(null)
                : session;

        // angleCode -> check-in image, so each check-out image can be compared with its counterpart
        Map<AngleCode, InspectionImage> checkInImageByAngle = new EnumMap<>(AngleCode.class);
        if (isCheckOut && checkInSession != null) {
            for (InspectionImage checkInImg : inspectionImageRepository.findBySession_SessionId(
                    checkInSession.getSessionId())) {
                if (checkInImg.getAngleCode() != null) {
                    checkInImageByAngle.putIfAbsent(checkInImg.getAngleCode(), checkInImg);
                }
            }
        }

        Map<UUID, List<DamageDto>> damagesByImage = damageDetectionRepository.findByImage_Session_SessionId(sessionId)
                .stream()
                .sorted(InspectionLabels.DAMAGE_ORDER)
                .collect(Collectors.groupingBy(
                        damage -> damage.getImage().getImageId(),
                        LinkedHashMap::new,
                        Collectors.mapping(DamageDto::fromEntity, Collectors.toList())));

        List<ImageResultDto> imageResults = inspectionImageRepository.findBySession_SessionId(sessionId)
                .stream()
                .sorted(Comparator.comparing(InspectionImage::getAngleCode))
                .map(image -> {
                    InspectionImage checkInImage = checkInImageByAngle.get(image.getAngleCode());
                    return ImageResultDto.builder()
                            .imageId(image.getImageId())
                            .imageUrl(image.getImageUrl())
                            .checkInImageId(checkInImage != null ? checkInImage.getImageId() : null)
                            .checkInImageUrl(checkInImage != null ? checkInImage.getImageUrl() : null)
                            .angleCode(image.getAngleCode())
                            .damages(damagesByImage.getOrDefault(image.getImageId(), List.of()))
                            .build();
                })
                .toList();

        return SessionResultResponseDto.builder()
                .sessionId(session.getSessionId())
                .sessionType(session.getSessionType())
                .aiStatus(isCheckOut ? AiStatus.forCheckOut(session.getAiStatus()) : null)
                .createdAt(session.getCreatedAt())
                .bookingId(booking.getBookingId())
                .bookingStatus(booking.getStatus())
                .expectedReturnAt(booking.getExpectedReturnAt())
                .checkInSessionId(checkInSession != null ? checkInSession.getSessionId() : null)
                .checkInAt(checkInSession != null ? checkInSession.getCreatedAt() : null)
                .vehicleId(vehicle.getVehicleId())
                .vehicle(VehicleResponseDto.fromEntity(vehicle))
                .renterName(renter != null ? renter.getName() : null)
                .renterPhone(renter != null ? renter.getPhoneNumber() : null)
                .staffName(session.getStaff() != null ? session.getStaff().getName() : null)
                .images(imageResults)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AiProgressDto getAiProgress(UUID sessionId) {
        InspectionSession session = findCheckOutSession(sessionId);
        String dbStatus = AiStatus.forCheckOut(session.getAiStatus());

        AiServiceClient.StatusLookup lookup = aiServiceClient.fetchStatus(sessionId);
        if (lookup.kind() == AiServiceClient.StatusLookup.Kind.FOUND) {
            return toLiveProgress(sessionId, lookup.body());
        }

        // AI restarted (lost its in-memory state) or unreachable: only the stored status is known
        return AiProgressDto.builder()
                .sessionId(sessionId)
                .status(dbStatus)
                .progress(AiStatus.DONE.equals(dbStatus) ? 100 : 0)
                .currentAngle(null)
                .completedAngles(List.of())
                .totalAngles(null)
                .newDamages(null)
                .error(null)
                .live(false)
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiProgressDto retryAi(UUID sessionId) {
        InspectionSession session = findCheckOutSession(sessionId);
        Booking booking = bookingRepository.findByIdForUpdate(session.getBooking().getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", session.getBooking().getBookingId()));

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new ConflictException("Phiên trả xe đã hoàn tất, không thể chạy lại AI.");
        }

        String status = AiStatus.forCheckOut(session.getAiStatus());
        switch (status) {
            case AiStatus.FAILED -> { /* always retryable */ }
            case AiStatus.DONE -> throw new ConflictException("AI đã phân tích xong phiên này, không cần chạy lại.");
            case AiStatus.PENDING, AiStatus.PROCESSING -> ensureStuck(session, status);
            default -> throw new ConflictException("Trạng thái AI không hợp lệ: " + status);
        }

        session.setAiStatus(AiStatus.PENDING);
        inspectionSessionRepository.saveAndFlush(session);
        triggerAiAfterCommit(sessionId);
        log.info("AI re-run requested for check-out session {} (previous status {})", sessionId, status);

        return AiProgressDto.builder()
                .sessionId(sessionId)
                .status(AiStatus.PENDING)
                .progress(0)
                .completedAngles(List.of())
                .live(false)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public String getImageUrl(UUID imageId) {
        InspectionImage image = inspectionImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionImage", imageId));
        if (!StringUtils.hasText(image.getImageUrl())) {
            throw new ResourceNotFoundException("Image URL for InspectionImage", imageId);
        }
        return image.getImageUrl();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> overrideDamage(UUID detectionId, OverrideDamageRequest request) {
        if (request == null || !StringUtils.hasText(request.overrideReason())) {
            throw new BadRequestException("Vui lòng chọn hoặc nhập lý do xoá lỗi AI.");
        }

        DamageDetection detection = damageDetectionRepository.findById(detectionId)
                .orElseThrow(() -> new ResourceNotFoundException("DamageDetection", detectionId));

        Booking booking = detection.getImage().getSession().getBooking();
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ConflictException("Phiên trả xe đã hoàn tất, không thể thay đổi kết quả AI.");
        }

        // Already overridden: keep the original reason (idempotent for double clicks)
        if (!Boolean.TRUE.equals(detection.getIsOverridden())) {
            detection.setIsOverridden(true);
            detection.setOverrideReason(request.overrideReason().trim());
            damageDetectionRepository.saveAndFlush(detection);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("detectionId", detection.getDetectionId());
        response.put("isOverridden", detection.getIsOverridden());
        response.put("overrideReason", detection.getOverrideReason());
        response.put("message", "Damage detection overridden successfully");
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InspectionResponseDto completeInspection(UUID sessionId) {
        InspectionSession session = findCheckOutSession(sessionId);

        Booking booking = bookingRepository.findByIdForUpdate(session.getBooking().getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", session.getBooking().getBookingId()));

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ConflictException("Phiên trả xe này đã được hoàn tất trước đó.");
        }

        String aiStatus = AiStatus.forCheckOut(session.getAiStatus());
        if (!AiStatus.DONE.equals(aiStatus)) {
            throw new ConflictException(
                    "AI chưa phân tích xong (trạng thái: %s). Hãy đợi AI hoàn tất hoặc chạy lại AI trước khi hoàn tất."
                            .formatted(aiStatus));
        }

        Vehicle vehicle = booking.getVehicle();

        List<DamageDetection> validDamages = damageDetectionRepository
                .findByImage_Session_SessionId(sessionId)
                .stream()
                .filter(damage -> !Boolean.TRUE.equals(damage.getIsOverridden()))
                .toList();

        VehicleStatus newVehicleStatus = validDamages.isEmpty()
                ? VehicleStatus.AVAILABLE
                : VehicleStatus.MAINTENANCE;

        vehicle.setStatus(newVehicleStatus);
        vehicle = vehicleRepository.saveAndFlush(vehicle);

        booking.setStatus(BookingStatus.COMPLETED);
        booking = bookingRepository.saveAndFlush(booking);

        int imageCount = inspectionImageRepository.findBySession_SessionId(sessionId).size();
        String message = validDamages.isEmpty()
                ? "Inspection completed. No valid damages found; vehicle status set to AVAILABLE."
                : "Inspection completed with %d valid damage(s); vehicle status set to MAINTENANCE."
                        .formatted(validDamages.size());

        return InspectionResponseDto.builder()
                .sessionId(session.getSessionId())
                .bookingId(booking.getBookingId())
                .vehicleId(vehicle.getVehicleId())
                .sessionType(session.getSessionType())
                .bookingStatus(booking.getStatus())
                .vehicleStatus(vehicle.getStatus())
                .imageCount(imageCount)
                .createdAt(session.getCreatedAt())
                .message(message)
                .build();
    }

    // ------------------------------------------------------------------ AI helpers

    /**
     * Calls the AI service after the current transaction commits (so it sees the saved images). A failed
     * call never breaks the request: the session is marked FAILED so the UI can offer a retry.
     */
    private void triggerAiAfterCommit(UUID sessionId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                if (!aiServiceClient.triggerDetection(sessionId)) {
                    try {
                        aiStatusUpdater.updateStatus(sessionId, AiStatus.FAILED);
                    } catch (RuntimeException ex) {
                        log.error("Could not mark session {} as FAILED after AI trigger error", sessionId, ex);
                    }
                }
            }
        });
    }

    /**
     * PENDING/PROCESSING may only be retried when the run is clearly lost: the session is older than
     * {@link #AI_STUCK_AFTER} and the AI service is not working on it (PROCESSING additionally requires
     * the AI service to answer 404, i.e. it restarted and forgot the session).
     */
    private void ensureStuck(InspectionSession session, String status) {
        LocalDateTime createdAt = session.getCreatedAt();
        boolean oldEnough = createdAt != null && createdAt.plus(AI_STUCK_AFTER).isBefore(LocalDateTime.now());
        if (!oldEnough) {
            throw new ConflictException("AI đang phân tích phiên này. Vui lòng đợi thêm trước khi chạy lại.");
        }

        AiServiceClient.StatusLookup lookup = aiServiceClient.fetchStatus(session.getSessionId());
        boolean aiIsWorking = lookup.kind() == AiServiceClient.StatusLookup.Kind.FOUND
                && isActiveAiStatus(lookup.body().get("status"));
        boolean allowed = AiStatus.PENDING.equals(status)
                ? !aiIsWorking
                : lookup.kind() == AiServiceClient.StatusLookup.Kind.NOT_FOUND;
        if (!allowed) {
            throw new ConflictException("AI đang phân tích phiên này. Vui lòng đợi thêm trước khi chạy lại.");
        }
    }

    private static boolean isActiveAiStatus(Object status) {
        return "QUEUED".equals(status) || AiStatus.PROCESSING.equals(status);
    }

    private static AiProgressDto toLiveProgress(UUID sessionId, Map<String, Object> body) {
        String rawStatus = body.get("status") instanceof String s ? s : AiStatus.PENDING;
        String status = "QUEUED".equals(rawStatus) ? AiStatus.PENDING : rawStatus;

        int progress = body.get("progress") instanceof Number n ? Math.max(0, Math.min(100, n.intValue())) : 0;
        List<String> completed = body.get("completedAngles") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();

        return AiProgressDto.builder()
                .sessionId(sessionId)
                .status(status)
                .progress(AiStatus.DONE.equals(status) ? 100 : progress)
                .currentAngle(body.get("currentAngle") instanceof String angle ? angle : null)
                .completedAngles(completed)
                .totalAngles(body.get("totalAngles") instanceof Number n ? n.intValue() : null)
                .newDamages(AiStatus.DONE.equals(status) && body.get("newDamages") instanceof Number n
                        ? n.intValue() : null)
                .error(body.get("error") instanceof String error ? error : null)
                .live(true)
                .build();
    }

    // ------------------------------------------------------------------ lookups & validation

    private InspectionSession findSession(UUID sessionId) {
        return inspectionSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionSession", sessionId));
    }

    private InspectionSession findCheckOutSession(UUID sessionId) {
        InspectionSession session = findSession(sessionId);
        if (session.getSessionType() != SessionType.CHECK_OUT) {
            throw new BadRequestException(
                    "Only CHECK_OUT sessions are supported here (session %s is %s)"
                            .formatted(sessionId, session.getSessionType()));
        }
        return session;
    }

    private void validateImages(List<MultipartFile> images, int expectedCount, String workflowName) {
        if (images == null || images.size() != expectedCount) {
            int actualCount = images == null ? 0 : images.size();
            throw new BadRequestException(
                    "%s requires exactly %d images, but received %d"
                            .formatted(workflowName, expectedCount, actualCount));
        }

        for (int i = 0; i < images.size(); i++) {
            MultipartFile file = images.get(i);
            if (file == null || file.isEmpty()) {
                throw new BadRequestException(
                        "%s image at index %d is missing or empty".formatted(workflowName, i));
            }
        }
    }

    private List<InspectionImage> saveInspectionImages(
            InspectionSession session,
            List<MultipartFile> files,
            List<AngleCode> angleCodes) {

        String folder = "inspections/" + session.getSessionId();
        List<String> uploadedUrls = new ArrayList<>(angleCodes.size());
        List<InspectionImage> entities = new ArrayList<>(angleCodes.size());

        try {
            for (int i = 0; i < angleCodes.size(); i++) {
                String imageUrl = s3StorageService.uploadFile(files.get(i), folder);
                uploadedUrls.add(imageUrl);

                entities.add(InspectionImage.builder()
                        .session(session)
                        .angleCode(angleCodes.get(i))
                        .imageUrl(imageUrl)
                        .build());
            }
        } catch (RuntimeException ex) {
            // A mid-batch failure: remove the files that already made it to the bucket.
            uploadedUrls.forEach(s3StorageService::deleteFileByUrl);
            throw ex;
        }

        // If the DB transaction later rolls back, remove the uploaded files as well.
        s3StorageService.deleteOnRollback(uploadedUrls);
        return inspectionImageRepository.saveAllAndFlush(entities);
    }

    /** The logged-in staff member (set by {@code JwtAuthenticationFilter}), else the default staff account. */
    private User resolveCurrentStaff() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && StringUtils.hasText(authentication.getName())
                && !"anonymousUser".equals(authentication.getName())) {
            var userOpt = userRepository.findByEmailAndIsDeletedFalse(authentication.getName());
            if (userOpt.isPresent()) {
                return userOpt.get();
            }
        }

        return userRepository.findByEmailAndIsDeletedFalse(DEFAULT_STAFF_EMAIL)
                .or(() -> userRepository.findByIsDeletedFalse().stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException("Staff User", DEFAULT_STAFF_EMAIL));
    }
}
