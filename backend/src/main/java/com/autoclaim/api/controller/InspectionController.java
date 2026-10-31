package com.autoclaim.api.controller;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/inspections")
@RequiredArgsConstructor
@Tag(name = "Inspections", description = "Vehicle check-in, check-out, AI results, damage override, and PDF report endpoints")
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
            summary = "Get Inspection Image Bytes",
            description = "Returns the raw binary image data (JPEG/PNG) for rendering in <img src=\"...\"> tags."
    )
    @GetMapping(
            value = "/images/{imageId}",
            produces = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE}
    )
    public ResponseEntity<byte[]> getImage(@PathVariable UUID imageId) {
        byte[] imageBytes = inspectionService.getImageBytes(imageId);
        MediaType contentType = isPng(imageBytes) ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(contentType)
                .body(imageBytes);
    }

    @Operation(
            summary = "Override AI Damage Detection",
            description = "Marks an AI damage detection as overridden (isOverridden = true) and optionally records overrideReason when field staff rejects a false positive."
    )
    @PatchMapping("/damages/{detectionId}/override")
    public ResponseEntity<Map<String, Object>> overrideDamage(
            @PathVariable UUID detectionId,
            @RequestBody(required = false) OverrideDamageRequest request) {
        return ResponseEntity.ok(inspectionService.overrideDamage(detectionId, request));
    }

    @Operation(
            summary = "Generate PDF Inspection Report",
            description = "Generates a PDF report for the inspection session and updates vehicle status to MAINTENANCE (if valid damages exist) or AVAILABLE (if none)."
    )
    @GetMapping(value = "/{sessionId}/report", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateReport(@PathVariable UUID sessionId) {
        byte[] pdfBytes = reportService.generateInspectionReport(sessionId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=inspection_report.pdf")
                .body(pdfBytes);
    }

    private boolean isPng(byte[] bytes) {
        return bytes != null
                && bytes.length >= 4
                && (bytes[0] & 0xFF) == 0x89
                && (bytes[1] & 0xFF) == 0x50
                && (bytes[2] & 0xFF) == 0x4E
                && (bytes[3] & 0xFF) == 0x47;
    }
}
