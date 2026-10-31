package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Optional reason when overriding an AI damage detection")
public record OverrideDamageRequest(
        @Schema(description = "Reason for rejecting the AI detection", example = "Water reflection / dirt, not a scratch")
        String overrideReason
) {
}
