package com.autoclaim.api.repository;

import com.autoclaim.api.dto.response.HistoryStaffOptionDto;
import com.autoclaim.api.dto.response.InspectionHistoryItemDto;
import com.autoclaim.api.dto.response.InspectionHistorySummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Read-only queries for the inspection history (returned rentals), shared by the staff and admin pages. Native SQL
 * because it needs DISTINCT ON, aggregated damage counts and unaccent(), which JPQL cannot express. Timestamps are
 * stored in Vietnam local time (the JVM runs with Asia/Ho_Chi_Minh), so the month filter compares them directly.
 */
@Repository
@RequiredArgsConstructor
public class InspectionHistoryRepository {

    /**
     * Filters of a history query. {@code searchPattern} / {@code month} are empty strings when unused.
     * Admin only: {@code staffId} (staff of the CHECK_OUT session, null = everyone) and {@code hasOverride}
     * (true = only returns with at least one detection rejected by staff).
     */
    public record Filter(String searchPattern, String result, String month, UUID staffId, boolean hasOverride) {
    }

    /**
     * Returned rentals: COMPLETED bookings with their latest CHECK_OUT session, the latest CHECK_IN session, the staff
     * of both and per-session damage counts (one aggregate, no N+1). Search is case- and accent-insensitive on both
     * sides. Applies the search / month / staff filters; the list adds the result / override filters on top.
     */
    private static final String HISTORY_CTE = """
            WITH co AS (
                SELECT DISTINCT ON (s.booking_id) s.session_id, s.booking_id, s.staff_id, s.created_at
                FROM inspection_sessions s
                WHERE s.session_type = 'CHECK_OUT'
                ORDER BY s.booking_id, s.created_at DESC
            ),
            ci AS (
                SELECT DISTINCT ON (s.booking_id) s.booking_id, s.staff_id, s.created_at
                FROM inspection_sessions s
                WHERE s.session_type = 'CHECK_IN'
                ORDER BY s.booking_id, s.created_at DESC
            ),
            cnt AS (
                SELECT i.session_id,
                       COUNT(*) FILTER (WHERE d.is_overridden IS NOT TRUE) AS active_count,
                       COUNT(*) FILTER (WHERE d.is_overridden IS TRUE)     AS overridden_count
                FROM damage_detections d
                JOIN inspection_images i ON i.image_id = d.image_id
                GROUP BY i.session_id
            ),
            history AS (
                SELECT co.session_id                    AS check_out_session_id,
                       b.booking_id                     AS booking_id,
                       v.model                          AS model,
                       v.license_plate                  AS license_plate,
                       v.avatar_url                     AS avatar_url,
                       r.name                           AS renter_name,
                       r.phone_number                   AS renter_phone,
                       ci.created_at                    AS check_in_at,
                       co.created_at                    AS check_out_at,
                       cos.name                         AS check_out_staff_name,
                       cis.name                         AS check_in_staff_name,
                       COALESCE(cnt.active_count, 0)     AS damage_count,
                       COALESCE(cnt.overridden_count, 0) AS overridden_count
                FROM bookings b
                JOIN co ON co.booking_id = b.booking_id
                JOIN vehicles v ON v.vehicle_id = b.vehicle_id
                JOIN renters r ON r.renter_id = b.renter_id
                LEFT JOIN users cos ON cos.user_id = co.staff_id
                LEFT JOIN ci ON ci.booking_id = b.booking_id
                LEFT JOIN users cis ON cis.user_id = ci.staff_id
                LEFT JOIN cnt ON cnt.session_id = co.session_id
                WHERE b.status = 'COMPLETED'
                  AND (:search = ''
                       OR unaccent(lower(v.license_plate)) LIKE unaccent(lower(:search)) ESCAPE '\\'
                       OR unaccent(lower(v.model))         LIKE unaccent(lower(:search)) ESCAPE '\\'
                       OR unaccent(lower(r.name))          LIKE unaccent(lower(:search)) ESCAPE '\\')
                  AND (:month = '' OR to_char(co.created_at, 'YYYY-MM') = :month)
                  AND (CAST(:staffId AS uuid) IS NULL OR co.staff_id = CAST(:staffId AS uuid))
            )
            """;

    private static final String LIST_SQL = HISTORY_CTE + """
            SELECT * FROM history
            WHERE (:result = 'ALL'
                   OR (:result = 'DAMAGED' AND damage_count > 0)
                   OR (:result = 'CLEAN' AND damage_count = 0))
              AND (:hasOverride = FALSE OR overridden_count > 0)
            """;

    /** Ignores the result / override filters on purpose: the cards give the overall picture of the current scope. */
    private static final String SUMMARY_SQL = HISTORY_CTE + """
            SELECT COUNT(*)                                          AS total_returns,
                   COUNT(*) FILTER (WHERE damage_count > 0)          AS damaged_returns,
                   COALESCE(SUM(damage_count + overridden_count), 0) AS ai_detections,
                   COALESCE(SUM(overridden_count), 0)                AS overridden_detections
            FROM history
            """;

    private static final String MONTHS_SQL = """
            SELECT DISTINCT to_char(co.created_at, 'YYYY-MM') AS month
            FROM bookings b
            JOIN inspection_sessions co ON co.booking_id = b.booking_id AND co.session_type = 'CHECK_OUT'
            WHERE b.status = 'COMPLETED'
            ORDER BY month DESC
            """;

    /** Everyone who ever ran a CHECK_OUT session, soft-deleted users and admins included, by name. */
    private static final String CHECK_OUT_STAFF_SQL = """
            SELECT u.user_id, u.name, u.is_deleted, ro.role_name
            FROM users u
            LEFT JOIN roles ro ON ro.role_id = u.role_id
            WHERE EXISTS (SELECT 1 FROM inspection_sessions s
                          WHERE s.staff_id = u.user_id AND s.session_type = 'CHECK_OUT')
            ORDER BY lower(u.name), u.user_id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<InspectionHistoryItemDto> findPage(Filter filter, int limit, long offset) {
        MapSqlParameterSource params = toParams(filter)
                .addValue("limit", limit)
                .addValue("offset", offset);
        return jdbc.query(LIST_SQL + " ORDER BY check_out_at DESC, check_out_session_id LIMIT :limit OFFSET :offset",
                params, InspectionHistoryRepository::mapRow);
    }

    public long count(Filter filter) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + LIST_SQL + ") AS filtered",
                toParams(filter), Long.class);
        return total != null ? total : 0L;
    }

    /** Totals over the search / month / staff filters (result and override of {@code filter} are ignored). */
    public InspectionHistorySummaryDto summarize(Filter filter) {
        return jdbc.queryForObject(SUMMARY_SQL, toParams(filter), (rs, rowNum) ->
                InspectionHistorySummaryDto.of(
                        rs.getLong("total_returns"),
                        rs.getLong("damaged_returns"),
                        rs.getLong("ai_detections"),
                        rs.getLong("overridden_detections")));
    }

    /** "YYYY-MM" months that have at least one returned rental, newest first. */
    public List<String> findMonths() {
        return jdbc.queryForList(MONTHS_SQL, new MapSqlParameterSource(), String.class);
    }

    /** Users who ran at least one CHECK_OUT session (soft-deleted and admins included), sorted by name. */
    public List<HistoryStaffOptionDto> findCheckOutStaff() {
        return jdbc.query(CHECK_OUT_STAFF_SQL, (rs, rowNum) -> new HistoryStaffOptionDto(
                rs.getObject("user_id", UUID.class),
                rs.getString("name"),
                rs.getBoolean("is_deleted"),
                rs.getString("role_name")));
    }

    private static MapSqlParameterSource toParams(Filter filter) {
        return new MapSqlParameterSource()
                .addValue("search", filter.searchPattern())
                .addValue("result", filter.result())
                .addValue("month", filter.month())
                // Bound as text and cast in SQL so a null keeps a known type for Postgres.
                .addValue("staffId", filter.staffId() != null ? filter.staffId().toString() : null, Types.VARCHAR)
                .addValue("hasOverride", filter.hasOverride());
    }

    private static InspectionHistoryItemDto mapRow(ResultSet rs, int rowNum) throws SQLException {
        int damageCount = rs.getInt("damage_count");
        return InspectionHistoryItemDto.builder()
                .checkOutSessionId(rs.getObject("check_out_session_id", UUID.class))
                .bookingId(rs.getObject("booking_id", UUID.class))
                .model(rs.getString("model"))
                .licensePlate(rs.getString("license_plate"))
                .avatarUrl(rs.getString("avatar_url"))
                .renterName(rs.getString("renter_name"))
                .renterPhone(rs.getString("renter_phone"))
                .checkInAt(toLocalDateTime(rs.getTimestamp("check_in_at")))
                .checkOutAt(toLocalDateTime(rs.getTimestamp("check_out_at")))
                .checkOutStaffName(rs.getString("check_out_staff_name"))
                .checkInStaffName(rs.getString("check_in_staff_name"))
                .damageCount(damageCount)
                .overriddenCount(rs.getInt("overridden_count"))
                .result(damageCount > 0 ? "DAMAGED" : "CLEAN")
                .build();
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }
}
