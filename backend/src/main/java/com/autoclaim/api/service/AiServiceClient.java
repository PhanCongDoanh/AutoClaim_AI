package com.autoclaim.api.service;

import com.autoclaim.api.dto.response.SlotValidationResponseDto;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.SessionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/** HTTP calls to the Python AI service (detection trigger and in-memory progress). */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${app.ai.detect-url:http://localhost:5000/api/ai/detect}")
    private String detectUrl;

    @Value("${app.ai.status-url:http://localhost:5000/api/ai/status}")
    private String statusUrl;

    @Value("${app.ai.validate-slot-url:http://localhost:5000/api/ai/validate-slot}")
    private String validateSlotUrl;

    /** Result of {@link #fetchStatus(UUID)}. {@code body} is only set when {@code kind == FOUND}. */
    public record StatusLookup(Kind kind, Map<String, Object> body) {
        public enum Kind { FOUND, NOT_FOUND, UNREACHABLE }
    }

    /**
     * Asks the AI service to analyse a CHECK_OUT session (it answers 202 and works in the background).
     *
     * @return false when the AI service could not be reached or rejected the request
     */
    public boolean triggerDetection(UUID sessionId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request =
                    new HttpEntity<>(Map.of("sessionId", sessionId.toString()), headers);
            restTemplate.postForEntity(detectUrl, request, String.class);
            log.info("Triggered AI detection for check-out session {} at {}", sessionId, detectUrl);
            return true;
        } catch (RestClientException ex) {
            log.error("Could not trigger AI detection at {} for session {}: {}", detectUrl, sessionId, ex.getMessage());
            return false;
        }
    }

    /** Reads the AI service's in-memory progress for a session ({@code GET {status-url}/{sessionId}}). */
    @SuppressWarnings("unchecked")
    public StatusLookup fetchStatus(UUID sessionId) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(statusUrl + "/" + sessionId, Map.class);
            Map<String, Object> body = response.getBody();
            return body != null
                    ? new StatusLookup(StatusLookup.Kind.FOUND, body)
                    : new StatusLookup(StatusLookup.Kind.NOT_FOUND, null);
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                return new StatusLookup(StatusLookup.Kind.NOT_FOUND, null);
            }
            log.warn("AI status request for session {} failed: {}", sessionId, ex.getMessage());
            return new StatusLookup(StatusLookup.Kind.UNREACHABLE, null);
        } catch (RestClientException ex) {
            log.warn("AI service unreachable at {} for session {}: {}", statusUrl, sessionId, ex.getMessage());
            return new StatusLookup(StatusLookup.Kind.UNREACHABLE, null);
        }
    }

    /**
     * Calls AI pre-validation for a single slot image against an optional reference image.
     */
    public SlotValidationResponseDto validateSlot(
            MultipartFile image,
            byte[] refBytes,
            String refFilename,
            AngleCode expectedAngle,
            SessionType inspectionType) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            final String imgName = image.getOriginalFilename() != null ? image.getOriginalFilename() : "image.jpg";
            body.add("image", new org.springframework.core.io.ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return imgName;
                }
            });
        } catch (IOException ex) {
            log.error("Failed to read slot image bytes: {}", ex.getMessage());
            return SlotValidationResponseDto.builder()
                    .valid(false)
                    .errorCode("INVALID_IMAGE")
                    .message("Không thể đọc tệp ảnh: " + ex.getMessage())
                    .build();
        }

        if (refBytes != null && refBytes.length > 0) {
            final String rName = refFilename != null ? refFilename : "reference.jpg";
            body.add("reference_image", new org.springframework.core.io.ByteArrayResource(refBytes) {
                @Override
                public String getFilename() {
                    return rName;
                }
            });
        }

        if (expectedAngle != null) {
            body.add("expected_angle", expectedAngle.name());
        }
        if (inspectionType != null) {
            body.add("inspection_type", inspectionType.name());
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<SlotValidationResponseDto> response = restTemplate.postForEntity(
                    validateSlotUrl, request, SlotValidationResponseDto.class);
            return response.getBody();
        } catch (RestClientResponseException ex) {
            log.warn("AI validate-slot returned error status {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            return SlotValidationResponseDto.builder()
                    .valid(false)
                    .errorCode("AI_VALIDATION_ERROR")
                    .message("Lỗi từ dịch vụ AI kiểm định: " + ex.getStatusCode())
                    .build();
        } catch (RestClientException ex) {
            log.error("AI service unreachable at {}: {}", validateSlotUrl, ex.getMessage());
            return SlotValidationResponseDto.builder()
                    .valid(false)
                    .errorCode("AI_SERVICE_UNAVAILABLE")
                    .message("Dịch vụ AI kiểm định tạm thời không khả dụng. Vui lòng thử lại sau.")
                    .build();
        }
    }
}
