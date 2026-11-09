package com.autoclaim.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
@Schema(description = "Credentials for JWT login")
public record LoginRequest(
        @Schema(description = "Account email", example = "user@example.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @Schema(description = "Account password", example = "password123")
        @NotBlank(message = "Password is required")
        String password
) {
}
