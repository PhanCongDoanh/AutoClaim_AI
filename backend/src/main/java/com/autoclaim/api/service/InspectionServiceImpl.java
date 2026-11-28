package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
import com.autoclaim.api.dto.response.AiProgressDto;
import com.autoclaim.api.dto.response.DamageDto;
import com.autoclaim.api.dto.response.ImageResultDto;
import com.autoclaim.api.dto.response.InspectionResponseDto;
import com.autoclaim.api.dto.response.SessionResultResponseDto;
import com.autoclaim.api.dto.response.SlotValidationResponseDto;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionImage;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.VehicleReferenceImage;
import com.autoclaim.api.entity.enums.AiStatus;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.ConflictException;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.exception.ValidationFailedException;
import com.autoclaim.api.repository.BookingRepository;
import com.autoclaim.api.repository.DamageDetectionRepository;
import com.autoclaim.api.repository.InspectionImageRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.autoclaim.api.repository.RenterRepository;
import com.autoclaim.api.repository.UserRepository;
import com.autoclaim.api.repository.VehicleReferenceImageRepository;
import com.autoclaim.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
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
    private final VehicleReferenceImageRepository vehicleReferenceImageRepository;

    @Value("${app.env:production}")
    private String appEnv;

    @Value("${app.inspection.allow-identical-checkout-image:false}")
    private boolean allowIdenticalCheckoutImageConfig;

    private boolean isAllowIdenticalCheckoutImage() {
        if (!StringUtils.hasText(appEnv)) {
            return false;
        }
        String env = appEnv.trim().toLowerCase();
        if ("prod".equals(env) || "production".equals(env)) {
            return false;
        }
        if (!Set.of("dev", "development", "test", "testing", "local").contains(env)) {
            return false;
        }
        return allowIdenticalCheckoutImageConfig;
    }

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

        // 1. Kiểm tra chống trùng lặp CCCD (index 0 và index 1)
        String cccdFrontHash = computeSha256(images.get(0));
        String cccdBackHash = computeSha256(images.get(1));
        if (!cccdFrontHash.isEmpty() && cccdFrontHash.equals(cccdBackHash)) {
            throw new ValidationFailedException(
                    "Ảnh CCCD mặt sau bị trùng lặp với mặt trước. Vui lòng chụp rõ hai mặt thẻ riêng biệt.",
                    "DUPLICATE_CCCD_IMAGE",
                    Map.of("invalidAngles", Map.of(
                            "CCCD_BACK", Map.of(
                                    "errorCode", "DUPLICATE_IMAGE",
                                    "message", "Ảnh CCCD mặt sau bị trùng lặp với mặt trước."
                            )
                    ))
            );
        }

        // 2. Kiểm tra chống trùng lặp giữa các góc chụp xe (Intra-batch duplicate check)
        Map<String, Integer> seenHashes = new LinkedHashMap<>();
        Map<String, Object> duplicateAngles = new LinkedHashMap<>();

        if (!cccdFrontHash.isEmpty()) seenHashes.put(cccdFrontHash, 0);
        if (!cccdBackHash.isEmpty()) seenHashes.put(cccdBackHash, 1);

        for (int i = 2; i < images.size(); i++) {
            String hash = computeSha256(images.get(i));
            if (hash.isEmpty()) continue;
            AngleCode currAngle = CHECK_IN_ANGLES.get(i);
            if (seenHashes.containsKey(hash)) {
                int firstIdx = seenHashes.get(hash);
                AngleCode prevAngle = CHECK_IN_ANGLES.get(firstIdx);
                String prevName = getAngleDisplayName(prevAngle);
                duplicateAngles.put(currAngle.name(), Map.of(
                        "errorCode", "DUPLICATE_IMAGE",
                        "message", "Ảnh này đã được sử dụng tại " + prevName + ". Vui lòng chụp ảnh khác."
                ));
            } else {
                seenHashes.put(hash, i);
            }
        }

        if (!duplicateAngles.isEmpty()) {
            throw new ValidationFailedException(
                    "Bộ ảnh Check-in có ảnh trùng lặp. Mỗi góc xe phải là ảnh chụp riêng biệt.",
                    "DUPLICATE_IMAGE_BATCH",
                    Map.of("invalidAngles", duplicateAngles)
            );
        }

        // 3. Final Submission Gate: Tiền kiểm định toàn bộ 8 góc xe trước khi commit (chỉ kiểm tra góc và chất lượng ảnh)
        Map<AngleCode, SlotValidationResponseDto> validationResults = new EnumMap<>(AngleCode.class);
        Map<String, Object> invalidAngles = new LinkedHashMap<>();

        for (int i = 2; i < CHECK_IN_ANGLES.size(); i++) {
            AngleCode angle = CHECK_IN_ANGLES.get(i);
            MultipartFile file = images.get(i);
            SlotValidationResponseDto val = validateSlot(vehicle.getVehicleId(), null, angle, SessionType.CHECK_IN, file, null);
            validationResults.put(angle, val);
            if (!val.isValid()) {
                invalidAngles.put(angle.name(), Map.of(
                        "errorCode", val.getErrorCode() != null ? val.getErrorCode() : "INVALID_ANGLE",
                        "message", val.getMessage() != null ? val.getMessage() : "Ảnh không đạt chuẩn kiểm định"
                ));
            }
        }

        if (!invalidAngles.isEmpty()) {
            throw new ValidationFailedException(
                    "Một hoặc nhiều góc ảnh Check-in không đạt tiêu chuẩn kiểm định.",
                    "VALIDATION_FAILED",
                    Map.of("invalidAngles", invalidAngles)
            );
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

        // d. Upload the 10 MultipartFiles to S3 and save their URLs into inspection_images with validation metadata
        List<InspectionImage> savedImages = saveInspectionImages(session, images, CHECK_IN_ANGLES, validationResults);

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

        // 1. Kiểm tra chống trùng lặp ảnh trong bộ 8 ảnh nhận lại xe
        Map<String, Integer> seenHashes = new LinkedHashMap<>();
        Map<String, Object> duplicateAngles = new LinkedHashMap<>();

        for (int i = 0; i < images.size(); i++) {
            String hash = computeSha256(images.get(i));
            if (hash.isEmpty()) continue;
            AngleCode currAngle = CHECK_OUT_ANGLES.get(i);
            if (seenHashes.containsKey(hash)) {
                int firstIdx = seenHashes.get(hash);
                AngleCode prevAngle = CHECK_OUT_ANGLES.get(firstIdx);
                String prevName = getAngleDisplayName(prevAngle);
                duplicateAngles.put(currAngle.name(), Map.of(
                        "errorCode", "DUPLICATE_IMAGE",
                        "message", "Ảnh này đã được sử dụng tại " + prevName + ". Vui lòng chụp ảnh khác."
                ));
            } else {
                seenHashes.put(hash, i);
            }
        }

        if (!duplicateAngles.isEmpty()) {
            throw new ValidationFailedException(
                    "Bộ ảnh Check-out có ảnh trùng lặp. Mỗi góc xe phải là ảnh chụp riêng biệt.",
                    "DUPLICATE_IMAGE_BATCH",
                    Map.of("invalidAngles", duplicateAngles)
            );
        }

        // 2. Final Submission Gate: Tiền kiểm định toàn bộ 8 góc đối chiếu với ảnh giao xe đã xác nhận
        Map<AngleCode, SlotValidationResponseDto> validationResults = new EnumMap<>(AngleCode.class);
        Map<String, Object> invalidAngles = new LinkedHashMap<>();

        for (int i = 0; i < CHECK_OUT_ANGLES.size(); i++) {
            AngleCode angle = CHECK_OUT_ANGLES.get(i);
            MultipartFile file = images.get(i);
            SlotValidationResponseDto val = validateSlot(vehicle.getVehicleId(), booking.getBookingId(), angle, SessionType.CHECK_OUT, file, null);
            validationResults.put(angle, val);
            if (!val.isValid()) {
                invalidAngles.put(angle.name(), Map.of(
                        "errorCode", val.getErrorCode() != null ? val.getErrorCode() : "INVALID_ANGLE",
                        "message", val.getMessage() != null ? val.getMessage() : "Ảnh không đạt chuẩn kiểm định căn chỉnh"
                ));
            }
        }

        if (!invalidAngles.isEmpty()) {
            throw new ValidationFailedException(
                    "Một hoặc nhiều góc ảnh Check-out không đạt tiêu chuẩn căn chỉnh hoặc góc chụp.",
                    "VALIDATION_FAILED",
                    Map.of("invalidAngles", invalidAngles)
            );
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

        // d. Upload the 8 images to S3 (ANGLE_1 to ANGLE_8) and save their URLs with validation metadata
        List<InspectionImage> savedImages = saveInspectionImages(session, images, CHECK_OUT_ANGLES, validationResults);

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
                .checkInStaffName(checkInSession != null && checkInSession.getStaff() != null
                        ? checkInSession.getStaff().getName()
                        : null)
                .handoverNotes(booking.getHandoverNotes())
                .maintenanceNotes(booking.getMaintenanceNotes())
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
            detection.setOverriddenBy(resolveCurrentStaff());
            detection.setOverriddenAt(LocalDateTime.now());
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
        return saveInspectionImages(session, files, angleCodes, null);
    }

    private List<InspectionImage> saveInspectionImages(
            InspectionSession session,
            List<MultipartFile> files,
            List<AngleCode> angleCodes,
            Map<AngleCode, SlotValidationResponseDto> validationResults) {

        String folder = "inspections/" + session.getSessionId();
        List<String> uploadedUrls = new ArrayList<>(angleCodes.size());
        List<InspectionImage> entities = new ArrayList<>(angleCodes.size());

        try {
            for (int i = 0; i < angleCodes.size(); i++) {
                String imageUrl = s3StorageService.uploadFile(files.get(i), folder);
                uploadedUrls.add(imageUrl);

                AngleCode angle = angleCodes.get(i);
                SlotValidationResponseDto val = validationResults != null ? validationResults.get(angle) : null;

                InspectionImage.InspectionImageBuilder imgBuilder = InspectionImage.builder()
                        .session(session)
                        .angleCode(angle)
                        .imageUrl(imageUrl);

                if (val != null) {
                    imgBuilder.isValid(val.isValid())
                            .detectedAngle(val.getDetectedAngle())
                            .deviationPercent(val.getDeviationPercent())
                            .alignmentReliable(val.isAlignmentReliable())
                            .errorCode(val.getErrorCode());
                } else {
                    imgBuilder.isValid(true);
                }

                entities.add(imgBuilder.build());
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

    @Override
    public SlotValidationResponseDto validateSlot(
            UUID vehicleId,
            UUID bookingId,
            AngleCode angleCode,
            SessionType sessionType,
            MultipartFile image,
            List<String> clientHashes) {

        if (image == null || image.isEmpty()) {
            return SlotValidationResponseDto.builder()
                    .valid(false)
                    .errorCode("INVALID_IMAGE")
                    .message("Tệp ảnh không hợp lệ hoặc rỗng.")
                    .build();
        }

        // 1. Calculate SHA-256
        String imageHash = computeSha256(image);

        // 2. Check duplicate with client hashes
        if (clientHashes != null && !imageHash.isEmpty() && clientHashes.contains(imageHash)) {
            return SlotValidationResponseDto.builder()
                    .valid(false)
                    .expectedAngle(angleCode != null ? angleCode.name() : null)
                    .errorCode("DUPLICATE_IMAGE")
                    .message("Ảnh này đã được sử dụng tại một góc khác. Vui lòng chụp ảnh khác.")
                    .imageHash(imageHash)
                    .build();
        }

        // 3. Resolve reference image
        byte[] refBytes = null;
        String refFilename = null;

        if (sessionType == SessionType.CHECK_OUT) {
            if (bookingId == null) {
                return SlotValidationResponseDto.builder()
                        .valid(false)
                        .expectedAngle(angleCode != null ? angleCode.name() : null)
                        .errorCode("MISSING_BOOKING_ID")
                        .message("Thiếu mã đơn thuê (bookingId) để lấy ảnh đối chứng giao xe.")
                        .imageHash(imageHash)
                        .build();
            }

            var checkInSession = inspectionSessionRepository
                    .findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(bookingId, SessionType.CHECK_IN)
                    .orElse(null);

            if (checkInSession != null) {
                var checkInImages = inspectionImageRepository.findBySession_SessionId(checkInSession.getSessionId());
                var matchingImage = checkInImages.stream()
                        .filter(img -> img.getAngleCode() == angleCode)
                        .findFirst()
                        .orElse(null);

                if (matchingImage != null && StringUtils.hasText(matchingImage.getImageUrl())) {
                    refBytes = s3StorageService.download(matchingImage.getImageUrl()).orElse(null);
                    refFilename = "checkin_" + angleCode.name() + ".jpg";
                }
            }

            if (refBytes == null) {
                String angleName = getAngleDisplayName(angleCode);
                log.warn("No Check-in reference image found for booking {} angle {}", bookingId, angleCode);
                return SlotValidationResponseDto.builder()
                        .valid(false)
                        .expectedAngle(angleCode != null ? angleCode.name() : null)
                        .errorCode("MISSING_REFERENCE_IMAGE")
                        .message("Không tìm thấy ảnh đối chứng giao xe (Check-in) cho góc " + angleName + ". Không thể đối chiếu nhận lại xe.")
                        .imageHash(imageHash)
                        .build();
            }

            if (!isAllowIdenticalCheckoutImage() && !imageHash.isEmpty() && imageHash.equals(computeSha256Bytes(refBytes))) {
                return SlotValidationResponseDto.builder()
                        .valid(false)
                        .expectedAngle(angleCode != null ? angleCode.name() : null)
                        .detectedAngle(angleCode != null ? angleCode.name() : null)
                        .viewpointVerified(true)
                        .qualityPassed(true)
                        .aligned(true)
                        .alignmentReliable(true)
                        .deviationPercent(0.0)
                        .errorCode("REUSED_REFERENCE_IMAGE")
                        .message("Ảnh trả xe trùng hoàn toàn với ảnh nhận xe. Vui lòng chụp ảnh thực tế tại thời điểm trả xe.")
                        .imageHash(imageHash)
                        .build();
            }
        } else {
            // CHECK_IN: Check-in tạo bộ ảnh gốc thực tế, không bắt buộc đối chiếu với ảnh mẫu hay ảnh phiên trước.
            refBytes = null;
            refFilename = null;
        }

        // 4. Call AI service
        SlotValidationResponseDto result = aiServiceClient.validateSlot(
                image, refBytes, refFilename, angleCode, sessionType);
        if (result != null) {
            result.setImageHash(imageHash);
        }
        return result;
    }

    public static String getAngleDisplayName(AngleCode code) {
        if (code == null) return "";
        return switch (code) {
            case ANGLE_1 -> "Đầu xe";
            case ANGLE_2 -> "Góc trước trái";
            case ANGLE_3 -> "Hông trái";
            case ANGLE_4 -> "Góc sau trái";
            case ANGLE_5 -> "Đuôi xe";
            case ANGLE_6 -> "Góc sau phải";
            case ANGLE_7 -> "Hông phải";
            case ANGLE_8 -> "Góc trước phải";
            case CCCD_FRONT -> "CCCD mặt trước";
            case CCCD_BACK -> "CCCD mặt sau";
        };
    }

    private String computeSha256(MultipartFile file) {
        if (file == null || file.isEmpty()) return "";
        try {
            return computeSha256Bytes(file.getBytes());
        } catch (IOException e) {
            log.error("Failed to calculate SHA-256 for file", e);
            return "";
        }
    }

    private String computeSha256Bytes(byte[] data) {
        if (data == null || data.length == 0) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("Failed to calculate SHA-256 for bytes", e);
            return "";
        }
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
