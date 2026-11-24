package com.autoclaim.api.dto.request;

import com.autoclaim.api.entity.enums.RoleName;
import com.autoclaim.api.validation.PasswordPolicy;
import com.autoclaim.api.validation.ValidStaffPassword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
@ValidStaffPassword
@Schema(description = "Admin request payload to create a new staff/admin user")
public record CreateStaffRequest(
        @Schema(description = "Full name of the staff member", example = "Tran Thi B")
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @Schema(description = "Email address used to log in", example = "tranthib@autoclaim.com")
        @NotBlank(message = "Vui lòng nhập email đăng nhập.")
        @Email(message = "Email không hợp lệ.")
        String email,

        @Schema(description = "Phone number", example = "0912345678")
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự.")
        String phone,

        @Schema(
                description = "Initial login password (" + PasswordPolicy.MIN_LENGTH + "-" + PasswordPolicy.MAX_LENGTH
                        + " chars, uppercase, lowercase, digit, special char, no spaces, no personal info)",
                example = "Xk9#mP2q!v"
        )
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        String password,

        @Schema(description = "Role name (STAFF or ADMIN, defaults to STAFF if omitted)", example = "STAFF")
        RoleName roleName
) {
}
