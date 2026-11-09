package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "JWT session returned after a successful login")
public record LoginResponse(
        @Schema(description = "Signed JWT to send as Authorization: Bearer", example = "jwt_token_string")
        String token,

        @Schema(description = "Application role", example = "ADMIN")
        RoleName roleName,

        @Schema(description = "Account email", example = "user@example.com")
        String email,

        @Schema(description = "Display name", example = "Tran Quoc Bao")
        String fullName
) {
}
