package com.autoclaim.api.exception;

import java.util.Map;

/**
 * 409 Conflict: the request is valid but clashes with the current state (e.g. a booking already has a
 * check-out session, or a session was already completed). {@code details} is returned to the client
 * as {@code ErrorResponse.details}.
 */
public class ConflictException extends RuntimeException {

    private final transient Map<String, Object> details;

    public ConflictException(String message) {
        this(message, null);
    }

    public ConflictException(String message, Map<String, Object> details) {
        super(message);
        this.details = details;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
