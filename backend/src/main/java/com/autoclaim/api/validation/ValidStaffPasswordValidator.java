package com.autoclaim.api.validation;

import com.autoclaim.api.dto.request.CreateStaffRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

public class ValidStaffPasswordValidator implements ConstraintValidator<ValidStaffPassword, CreateStaffRequest> {

    @Override
    public boolean isValid(CreateStaffRequest request, ConstraintValidatorContext context) {
        if (request == null || request.password() == null || request.password().isBlank()) {
            // Let @NotBlank on `password` report the missing-field message.
            return true;
        }

        List<String> violations = PasswordPolicy.validate(
                request.password(),
                request.email(),
                request.fullName()
        );

        if (violations.isEmpty()) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(String.join(" ", violations))
                .addPropertyNode("password")
                .addConstraintViolation();
        return false;
    }
}
