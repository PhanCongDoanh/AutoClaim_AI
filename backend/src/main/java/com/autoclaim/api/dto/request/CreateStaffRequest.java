package com.autoclaim.api.dto.request;

import com.autoclaim.api.entity.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
@Schema(description = "Admin request payload to create a new staff/admin user")
public record CreateStaffRequest(
        @Schema(description = "Full name of the staff member", example = "Tran Thi B")
        @NotBlank(message = "Name is required")
        String name,

        @Schema(description = "Email address", example = "tranthib@autoclaim.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @Schema(description = "Phone number", example = "0912345678")
        String phone,

        @Schema(description = "Role name (STAFF or ADMIN, defaults to STAFF if omitted)", example = "STAFF")
        RoleName roleName
) {
}
