package com.autoclaim.api.dto.request;

import com.autoclaim.api.entity.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
@Schema(description = "Admin request payload to update an existing staff/admin user. Email and password cannot be changed here.")
public record UpdateStaffRequest(
        @Schema(description = "Full name of the staff member", example = "Tran Thi B")
        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Full name must be at most 100 characters")
        String fullName,

        @Schema(description = "Phone number", example = "0912345678")
        @Size(max = 20, message = "Phone must be at most 20 characters")
        String phone,

        @Schema(description = "Role name (STAFF or ADMIN)", example = "STAFF")
        RoleName roleName
) {
}
