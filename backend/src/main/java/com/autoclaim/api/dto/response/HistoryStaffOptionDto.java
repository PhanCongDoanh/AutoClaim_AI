package com.autoclaim.api.dto.response;

import java.util.UUID;

/**
 * A user who ran at least one CHECK_OUT session, for the staff filter of the admin history
 * (GET /api/admin/inspections/history/staff). Soft-deleted users are kept on purpose: staff who left are often
 * the ones whose reviews need checking.
 *
 * @param deleted  true when the user was soft-deleted
 * @param roleName ADMIN | STAFF
 */
public record HistoryStaffOptionDto(UUID userId, String fullName, boolean deleted, String roleName) {
}
