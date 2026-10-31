package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.enums.AngleCode;
import lombok.Builder;

import java.util.List;
import java.util.UUID;

@Builder
public record ImageResultDto(
        UUID imageId,
        UUID checkInImageId,
        AngleCode angleCode,
        List<DamageDto> damages
) {
}
