package com.autoclaim.api.dto.request;

import com.autoclaim.api.entity.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
@Schema(description = "Admin request payload to create a new staff/admin user")
public record CreateStaffRequest(
        @Schema(description = "Full name of the staff member", example = "Tran Thi B")
        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Full name must be at most 100 characters")
        String fullName,

        @Schema(description = "Email address used to log in", example = "tranthib@autoclaim.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @Schema(description = "Phone number", example = "0912345678")
        @Size(max = 20, message = "Phone must be at most 20 characters")
        String phone,

        // BCrypt only uses the first 72 bytes, so longer passwords would be silently truncated.
        @Schema(description = "Initial login password (6-72 characters)", example = "Autoclaim@2026")
        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 72, message = "Password must be between 6 and 72 characters")
        String password,

        @Schema(description = "Role name (STAFF or ADMIN, defaults to STAFF if omitted)", example = "STAFF")
        RoleName roleName
) {
}
