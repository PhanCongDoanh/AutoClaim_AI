package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
import com.autoclaim.api.dto.response.AiProgressDto;
import com.autoclaim.api.dto.response.InspectionResponseDto;
import com.autoclaim.api.dto.response.SessionResultResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface InspectionService {

    InspectionResponseDto checkIn(CheckInRequest request, List<MultipartFile> images);

    InspectionResponseDto checkOut(CheckOutRequest request, List<MultipartFile> images);

    SessionResultResponseDto getSessionResults(UUID sessionId);

    /** Live AI progress of a CHECK_OUT session, falling back to the stored {@code ai_status}. */
    AiProgressDto getAiProgress(UUID sessionId);

    /** Re-runs AI detection for a FAILED (or stuck) CHECK_OUT session of an ACTIVE booking. */
    AiProgressDto retryAi(UUID sessionId);

    String getImageUrl(UUID imageId);

    Map<String, Object> overrideDamage(UUID detectionId, OverrideDamageRequest request);

    InspectionResponseDto completeInspection(UUID sessionId);
}
