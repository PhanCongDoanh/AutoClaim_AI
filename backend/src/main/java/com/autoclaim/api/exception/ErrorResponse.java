package com.autoclaim.api.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors,
        /** Extra machine-readable data, e.g. {@code {"sessionId": "..."}} on a 409 duplicate check-out. */
        Map<String, Object> details
) {
}
