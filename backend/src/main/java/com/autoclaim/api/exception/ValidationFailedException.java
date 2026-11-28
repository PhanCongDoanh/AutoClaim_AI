package com.autoclaim.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.Map;

@Getter
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class ValidationFailedException extends RuntimeException {

    private final String errorCode;
    private final Map<String, Object> details;

    public ValidationFailedException(String message) {
        this(message, "VALIDATION_FAILED", null);
    }

    public ValidationFailedException(String message, String errorCode, Map<String, Object> details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
