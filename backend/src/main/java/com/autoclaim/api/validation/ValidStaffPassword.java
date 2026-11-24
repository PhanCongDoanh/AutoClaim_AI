package com.autoclaim.api.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidStaffPasswordValidator.class)
public @interface ValidStaffPassword {

    String message() default "Mật khẩu chưa đạt yêu cầu bảo mật.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
