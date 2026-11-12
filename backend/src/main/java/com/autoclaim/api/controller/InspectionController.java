package com.autoclaim.api.controller;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
import com.autoclaim.api.dto.response.AiProgressDto;
import com.autoclaim.api.dto.response.InspectionResponseDto;
import com.autoclaim.api.dto.response.SessionResultResponseDto;
import com.autoclaim.api.service.InspectionService;
import com.autoclaim.api.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/inspections")
@RequiredArgsConstructor
@Tag(name = "Inspections", description = "Vehicle check-in, check-out, AI results, damage override, completion, and PDF report endpoints")
public class InspectionController {

    private final InspectionService inspectionService;
    private final ReportService reportService;

    @Operation(
            summary = "Vehicle Check-In",
            description = "Creates a renter, an ACTIVE booking, sets vehicle status to RENTED, and saves 10 inspection images (2 ID cards + 8 vehicle angles)."
    )
    @PostMapping(value = "/check-in", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<InspectionResponseDto> checkIn(
            @Parameter(
                    description = "Check-in JSON payload (CheckInRequest)",
                    required = true,
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = CheckInRequest.class)
                    )
            )
            @Valid @RequestPart("data") CheckInRequest request,

            @Parameter(
                    description = "Exactly 10 images (CCCD_FRONT, CCCD_BACK, ANGLE_1 to ANGLE_8)",
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            array = @ArraySchema(schema = @Schema(type = "string", format = "binary"))
                    )
            )
            @RequestPart("images") List<MultipartFile> images) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inspectionService.checkIn(request, images));
    }

    @Operation(
            summary = "Vehicle Check-Out",
            description = "Creates a CHECK_OUT inspection session for an active booking, saves 8 vehicle angle images, and triggers Python AI damage detection."
    )
    @PostMapping(value = "/check-out", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<InspectionResponseDto> checkOut(
            @Parameter(
                    description = "Check-out JSON payload (CheckOutRequest)",
                    required = true,
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = CheckOutRequest.class)
                    )
            )
            @Valid @RequestPart("data") CheckOutRequest request,

            @Parameter(
                    description = "Exactly 8 vehicle angle images (ANGLE_1 to ANGLE_8)",
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            array = @ArraySchema(schema = @Schema(type = "string", format = "binary"))
                    )
            )
            @RequestPart("images") List<MultipartFile> images) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inspectionService.checkOut(request, images));
    }

    @Operation(
            summary = "Get Inspection Session Results",
            description = "Fetches an inspection session, its images (with matched checkInImageId for side-by-side slider), and all AI damage detections per image."
    )
    @GetMapping("/{sessionId}/results")
    public ResponseEntity<SessionResultResponseDto> getSessionResults(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(inspectionService.getSessionResults(sessionId));
    }

    @Operation(
            summary = "Get AI Detection Progress",
            description = "Progress of the AI damage detection for a CHECK_OUT session: status (PENDING | PROCESSING | DONE | FAILED), "
                    + "progress 0-100, currentAngle and completedAngles. Uses the AI service's live state, or the stored ai_status "
                    + "when the AI service has restarted or is unreachable (live = false)."
    )
    @GetMapping("/{sessionId}/ai-progress")
    public ResponseEntity<AiProgressDto> getAiProgress(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(inspectionService.getAiProgress(sessionId));
    }

    @Operation(
            summary = "Retry AI Detection",
            description = "Re-runs AI detection for a CHECK_OUT session of an ACTIVE booking. Allowed when ai_status is FAILED (or null), "
                    + "PENDING for over 2 minutes while the AI is not working on it, or PROCESSING for over 2 minutes when the AI "
                    + "service no longer knows the session (404). Otherwise 409. Staff overrides are kept by the AI service."
    )
    @PostMapping("/{sessionId}/ai-retry")
    public ResponseEntity<AiProgressDto> retryAi(@PathVariable UUID sessionId) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(inspectionService.retryAi(sessionId));
    }

    @Operation(
            summary = "Get Inspection Image",
            description = "Redirects (302) to the image's public URL in object storage, so <img src=\"/api/inspections/images/{id}\"> keeps working. Prefer using imageUrl from the results endpoint directly."
    )
    @GetMapping("/images/{imageId}")
    public ResponseEntity<Void> getImage(@PathVariable UUID imageId) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(inspectionService.getImageUrl(imageId)))
                .build();
    }

    @Operation(
            summary = "Override AI Damage Detection",
            description = "Marks an AI damage detection as overridden (isOverridden = true) and records the required overrideReason when field staff rejects a false positive. 400 when the reason is blank, 409 when the check-out is already completed."
    )
    @PatchMapping("/damages/{detectionId}/override")
    public ResponseEntity<Map<String, Object>> overrideDamage(
            @PathVariable UUID detectionId,
            @RequestBody(required = false) OverrideDamageRequest request) {
        return ResponseEntity.ok(inspectionService.overrideDamage(detectionId, request));
    }

    @Operation(
            summary = "Complete Check-Out Inspection",
            description = "Finalizes a CHECK_OUT inspection session: sets Booking status to COMPLETED and updates Vehicle status to MAINTENANCE (if valid damages exist) or AVAILABLE (if none). 409 when the AI is not DONE or the session was already completed."
    )
    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<InspectionResponseDto> completeInspection(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(inspectionService.completeInspection(sessionId));
    }

    @Operation(
            summary = "Generate PDF Inspection Report (Read-Only)",
            description = "Generates and returns the PDF inspection report without mutating Vehicle or Booking state."
    )
    @GetMapping(value = "/{sessionId}/report", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateReport(@PathVariable UUID sessionId) {
        byte[] pdfBytes = reportService.generateInspectionReport(sessionId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=inspection_report.pdf")
                .body(pdfBytes);
    }
}
