package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.CheckInRequest;
import com.autoclaim.api.dto.request.CheckOutRequest;
import com.autoclaim.api.dto.request.OverrideDamageRequest;
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

    String getImageUrl(UUID imageId);

    Map<String, Object> overrideDamage(UUID detectionId, OverrideDamageRequest request);

    InspectionResponseDto completeInspection(UUID sessionId);
}
