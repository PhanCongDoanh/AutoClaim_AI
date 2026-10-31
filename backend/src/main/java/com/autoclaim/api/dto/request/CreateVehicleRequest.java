package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
@Schema(description = "Admin request payload to create a new vehicle")
public record CreateVehicleRequest(
        @Schema(description = "Vehicle model name", example = "Toyota Vios 2024")
        @NotBlank(message = "Vehicle model is required")
        String model,

        @Schema(description = "Unique license plate", example = "43A-888.99")
        @NotBlank(message = "License plate is required")
        String licensePlate,

        @Schema(description = "Number of seats (defaults to 5 if omitted)", example = "5")
        Integer seats
) {
}
