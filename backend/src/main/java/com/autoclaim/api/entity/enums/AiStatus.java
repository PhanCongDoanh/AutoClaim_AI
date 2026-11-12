package com.autoclaim.api.entity.enums;

/**
 * Values of {@code inspection_sessions.ai_status}. Stored as plain strings (not a JPA enum) because the
 * Python AI service writes PROCESSING / DONE / FAILED straight into the column.
 */
public final class AiStatus {

    public static final String PENDING = "PENDING";
    public static final String PROCESSING = "PROCESSING";
    public static final String DONE = "DONE";
    public static final String FAILED = "FAILED";

    private AiStatus() {
    }

    /**
     * Status exposed to clients for a CHECK_OUT session: a missing value (sessions created before V6, or
     * never triggered) is reported as FAILED so the UI offers "Thử lại".
     */
    public static String forCheckOut(String stored) {
        return stored == null ? FAILED : stored;
    }
}
