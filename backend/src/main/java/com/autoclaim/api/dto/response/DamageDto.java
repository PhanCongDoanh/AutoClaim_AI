package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.DamageDetection;
import lombok.Builder;

import java.util.UUID;

@Builder
public record DamageDto(
        UUID detectionId,
        String damageType,
        String partName,
        Double confidenceScore,
        String boundingBox,
        Boolean isOverridden,
        String overrideReason
) {

    public static DamageDto fromEntity(DamageDetection entity) {
        return DamageDto.builder()
                .detectionId(entity.getDetectionId())
                .damageType(entity.getDamageType())
                .partName(entity.getPartName())
                .confidenceScore(entity.getConfidenceScore())
                .boundingBox(entity.getBoundingBox())
                .isOverridden(entity.getIsOverridden())
                .overrideReason(entity.getOverrideReason())
                .build();
    }
}
