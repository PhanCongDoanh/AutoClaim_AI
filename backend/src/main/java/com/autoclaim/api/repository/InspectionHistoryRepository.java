package com.autoclaim.api.repository;

import com.autoclaim.api.dto.response.InspectionHistoryItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Read-only queries for the inspection history (returned rentals). Native SQL because it needs DISTINCT ON,
 * aggregated damage counts and unaccent(), which JPQL cannot express. Timestamps are stored in Vietnam local time
 * (the JVM runs with Asia/Ho_Chi_Minh), so the month filter compares them directly.
 */
@Repository
@RequiredArgsConstructor
public class InspectionHistoryRepository {

    /** Filters of a history query; {@code searchPattern} / {@code month} are empty strings when unused. */
    public record Filter(String searchPattern, String result, String month) {
    }

    /**
     * Returned rentals: COMPLETED bookings with their latest CHECK_OUT session, the latest CHECK_IN session and
     * per-session damage counts (one aggregate, no N+1). Search is case- and accent-insensitive on both sides.
     */
    private static final String BASE_SQL = """
            WITH co AS (
                SELECT DISTINCT ON (s.booking_id) s.session_id, s.booking_id, s.created_at
                FROM inspection_sessions s
                WHERE s.session_type = 'CHECK_OUT'
                ORDER BY s.booking_id, s.created_at DESC
            ),
            ci AS (
                SELECT DISTINCT ON (s.booking_id) s.booking_id, s.created_at
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
                       COALESCE(cnt.active_count, 0)     AS damage_count,
                       COALESCE(cnt.overridden_count, 0) AS overridden_count
                FROM bookings b
                JOIN co ON co.booking_id = b.booking_id
                JOIN vehicles v ON v.vehicle_id = b.vehicle_id
                JOIN renters r ON r.renter_id = b.renter_id
                LEFT JOIN ci ON ci.booking_id = b.booking_id
                LEFT JOIN cnt ON cnt.session_id = co.session_id
                WHERE b.status = 'COMPLETED'
                  AND (:search = ''
                       OR unaccent(lower(v.license_plate)) LIKE unaccent(lower(:search)) ESCAPE '\\'
                       OR unaccent(lower(v.model))         LIKE unaccent(lower(:search)) ESCAPE '\\'
                       OR unaccent(lower(r.name))          LIKE unaccent(lower(:search)) ESCAPE '\\')
                  AND (:month = '' OR to_char(co.created_at, 'YYYY-MM') = :month)
            )
            SELECT * FROM history
            WHERE :result = 'ALL'
               OR (:result = 'DAMAGED' AND damage_count > 0)
               OR (:result = 'CLEAN' AND damage_count = 0)
            """;

    private static final String MONTHS_SQL = """
            SELECT DISTINCT to_char(co.created_at, 'YYYY-MM') AS month
            FROM bookings b
            JOIN inspection_sessions co ON co.booking_id = b.booking_id AND co.session_type = 'CHECK_OUT'
            WHERE b.status = 'COMPLETED'
            ORDER BY month DESC
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<InspectionHistoryItemDto> findPage(Filter filter, int limit, long offset) {
        MapSqlParameterSource params = toParams(filter)
                .addValue("limit", limit)
                .addValue("offset", offset);
        return jdbc.query(BASE_SQL + " ORDER BY check_out_at DESC, check_out_session_id LIMIT :limit OFFSET :offset",
                params, InspectionHistoryRepository::mapRow);
    }

    public long count(Filter filter) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + BASE_SQL + ") AS filtered",
                toParams(filter), Long.class);
        return total != null ? total : 0L;
    }

    /** "YYYY-MM" months that have at least one returned rental, newest first. */
    public List<String> findMonths() {
        return jdbc.queryForList(MONTHS_SQL, new MapSqlParameterSource(), String.class);
    }

    private static MapSqlParameterSource toParams(Filter filter) {
        return new MapSqlParameterSource()
                .addValue("search", filter.searchPattern())
                .addValue("result", filter.result())
                .addValue("month", filter.month());
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
                .damageCount(damageCount)
                .overriddenCount(rs.getInt("overridden_count"))
                .result(damageCount > 0 ? "DAMAGED" : "CLEAN")
                .build();
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }
}
