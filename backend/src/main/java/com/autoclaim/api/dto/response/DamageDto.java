package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.User;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record DamageDto(
        UUID detectionId,
        String damageType,
        String partName,
        Double confidenceScore,
        String boundingBox,
        Boolean isOverridden,
        String overrideReason,
        /** Name of the staff member who rejected the detection; null when not overridden or overridden before V7. */
        String overriddenByName,
        /** When it was rejected; null when not overridden or overridden before V7. */
        LocalDateTime overriddenAt
) {

    public static DamageDto fromEntity(DamageDetection entity) {
        User overriddenBy = entity.getOverriddenBy();
        return DamageDto.builder()
                .detectionId(entity.getDetectionId())
                .damageType(entity.getDamageType())
                .partName(entity.getPartName())
                .confidenceScore(entity.getConfidenceScore())
                .boundingBox(entity.getBoundingBox())
                .isOverridden(entity.getIsOverridden())
                .overrideReason(entity.getOverrideReason())
                .overriddenByName(overriddenBy != null ? overriddenBy.getName() : null)
                .overriddenAt(entity.getOverriddenAt())
                .build();
    }
}
