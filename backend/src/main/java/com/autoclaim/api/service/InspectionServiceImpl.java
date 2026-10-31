package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
import com.autoclaim.api.dto.response.DamageDto;
import com.autoclaim.api.dto.response.ImageResultDto;
import com.autoclaim.api.dto.response.InspectionResponseDto;
import com.autoclaim.api.dto.response.SessionResultResponseDto;
import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionImage;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.FileProcessingException;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InspectionServiceImpl implements InspectionService {

    private static final String DEFAULT_STAFF_EMAIL = "staff@autoclaim.com";

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
    private final RestTemplate restTemplate;

    @Value("${app.ai.detect-url:http://localhost:5000/api/ai/detect}")
    private String aiDetectUrl;

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

        // d. Loop through the 10 MultipartFiles, convert to byte[], and save them into inspection_images
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

        // a. Verify the Booking exists and is ACTIVE
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", request.bookingId()));

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new BadRequestException(
                    "Booking %s is not active (current status: %s)"
                            .formatted(booking.getBookingId(), booking.getStatus()));
        }

        User staff = resolveCurrentStaff();

        // b. Create an InspectionSession with type CHECK_OUT linked to the active Booking
        InspectionSession session = InspectionSession.builder()
                .booking(booking)
                .staff(staff)
                .sessionType(SessionType.CHECK_OUT)
                .build();
        session = inspectionSessionRepository.saveAndFlush(session);

        // c. Convert and save the 8 images to inspection_images (ANGLE_1 to ANGLE_8) as byte[]
        List<InspectionImage> savedImages = saveInspectionImages(session, images, CHECK_OUT_ANGLES);

        // d. AI Trigger: POST {"sessionId": "<the_new_session_id>"} to http://localhost:5000/api/ai/detect
        boolean aiTriggered = triggerAiDetection(session.getSessionId());
        String statusMessage = aiTriggered
                ? "Check-out images saved successfully. AI is processing."
                : "Check-out images saved successfully. AI is pending (service unreachable).";

        Vehicle vehicle = booking.getVehicle();

        return InspectionResponseDto.builder()
                .sessionId(session.getSessionId())
                .bookingId(booking.getBookingId())
                .vehicleId(vehicle.getVehicleId())
                .sessionType(session.getSessionType())
                .bookingStatus(booking.getStatus())
                .vehicleStatus(vehicle.getStatus())
                .imageCount(savedImages.size())
                .createdAt(session.getCreatedAt())
                .message(statusMessage)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResultResponseDto getSessionResults(UUID sessionId) {
        InspectionSession session = inspectionSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionSession", sessionId));

        // Build angleCode -> checkInImageId map for the side-by-side comparison slider
        Map<AngleCode, UUID> checkInImageByAngle = new EnumMap<>(AngleCode.class);
        UUID bookingId = session.getBooking().getBookingId();
        inspectionSessionRepository.findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
                        bookingId, SessionType.CHECK_IN)
                .ifPresent(checkInSession -> {
                    for (InspectionImage checkInImg : inspectionImageRepository.findBySession_SessionId(
                            checkInSession.getSessionId())) {
                        if (checkInImg.getAngleCode() != null) {
                            checkInImageByAngle.putIfAbsent(checkInImg.getAngleCode(), checkInImg.getImageId());
                        }
                    }
                });

        List<InspectionImage> images = inspectionImageRepository.findBySession_SessionId(sessionId);

        List<ImageResultDto> imageResults = images.stream()
                .map(image -> {
                    List<DamageDto> damages = damageDetectionRepository.findByImage_ImageId(image.getImageId())
                            .stream()
                            .map(DamageDto::fromEntity)
                            .toList();

                    return ImageResultDto.builder()
                            .imageId(image.getImageId())
                            .checkInImageId(checkInImageByAngle.get(image.getAngleCode()))
                            .angleCode(image.getAngleCode())
                            .damages(damages)
                            .build();
                })
                .toList();

        return SessionResultResponseDto.builder()
                .sessionId(session.getSessionId())
                .sessionType(session.getSessionType())
                .vehicleId(session.getBooking().getVehicle().getVehicleId())
                .images(imageResults)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getImageBytes(UUID imageId) {
        InspectionImage image = inspectionImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionImage", imageId));
        return image.getImageData();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> overrideDamage(UUID detectionId, OverrideDamageRequest request) {
        DamageDetection detection = damageDetectionRepository.findById(detectionId)
                .orElseThrow(() -> new ResourceNotFoundException("DamageDetection", detectionId));

        detection.setIsOverridden(true);
        if (request != null && StringUtils.hasText(request.overrideReason())) {
            detection.setOverrideReason(request.overrideReason().trim());
        }
        damageDetectionRepository.saveAndFlush(detection);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("detectionId", detection.getDetectionId());
        response.put("isOverridden", detection.getIsOverridden());
        response.put("overrideReason", detection.getOverrideReason());
        response.put("message", "Damage detection overridden successfully");
        return response;
    }

    private boolean triggerAiDetection(UUID sessionId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> payload = Map.of("sessionId", sessionId.toString());
            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(aiDetectUrl, requestEntity, String.class);
            log.info("Triggered Python AI detection for check-out session {} at {}", sessionId, aiDetectUrl);
            return true;
        } catch (RestClientException ex) {
            log.error("AI Service is down at {} for session {}. Images are saved in DB; AI processing is pending: {}",
                    aiDetectUrl, sessionId, ex.getMessage());
            return false;
        }
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

        List<InspectionImage> entities = new ArrayList<>(angleCodes.size());
        for (int i = 0; i < angleCodes.size(); i++) {
            MultipartFile file = files.get(i);
            AngleCode angleCode = angleCodes.get(i);
            byte[] imageBytes = toByteArray(file, angleCode, i);

            entities.add(InspectionImage.builder()
                    .session(session)
                    .angleCode(angleCode)
                    .imageData(imageBytes)
                    .build());
        }
        return inspectionImageRepository.saveAllAndFlush(entities);
    }

    private byte[] toByteArray(MultipartFile file, AngleCode angleCode, int index) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new FileProcessingException(
                    "Failed to convert image at index %d (%s) to byte[]".formatted(index, angleCode), ex);
        }
    }

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
