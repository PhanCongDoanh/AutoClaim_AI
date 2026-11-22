package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Request payload for completing vehicle maintenance")
public record CompleteMaintenanceRequest(
        @Schema(description = "Maintenance completion notes (max 1000 characters)", maxLength = 1000, example = "Repainted front bumper and polished right door")
        String maintenanceNotes
) {
}
