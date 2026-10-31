package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.enums.SessionType;
import lombok.Builder;

import java.util.List;
import java.util.UUID;

@Builder
public record SessionResultResponseDto(
        UUID sessionId,
        SessionType sessionType,
        UUID vehicleId,
        List<ImageResultDto> images
) {
}
