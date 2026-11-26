package com.autoclaim.api.repository;

import com.autoclaim.api.dto.response.StatisticsResponseDto.StaffAiReviewStatItem;
import com.autoclaim.api.dto.response.StatisticsResponseDto.Summary;
import com.autoclaim.api.dto.response.StatisticsResponseDto.TopDamagedVehicleItem;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only native SQL queries for {@code GET /api/v1/statistics}.
 *
 * <p>Uses the exact same completed-return definition as {@link InspectionHistoryRepository}:
 * {@code bookings.status = 'COMPLETED'} joined with the latest {@code CHECK_OUT} session per booking,
 * vehicles, renters, and per-session {@code damage_detections} split by {@code is_overridden}.
 */
@Repository
@RequiredArgsConstructor
public class StatisticsRepository {

    public record Scope(LocalDateTime startAt, LocalDateTime endAt, UUID vehicleId) {
    }

    public record MonthlyCountRow(String month, long totalReturns, long damagedReturns) {
    }

    public record DamageCountRow(String damageType, long count) {
    }

    /**
     * Shared CTE matching {@link InspectionHistoryRepository} so totals across Statistics and Inspection History
     * are guaranteed to stay 100% consistent.
     */
    private static final String SCOPED_RETURNS_CTE = """
            WITH co AS (
                SELECT DISTINCT ON (s.booking_id) s.session_id, s.booking_id, s.staff_id, s.created_at
                FROM inspection_sessions s
                WHERE s.session_type = 'CHECK_OUT'
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
            scoped AS (
                SELECT co.session_id                     AS check_out_session_id,
                       b.booking_id                      AS booking_id,
                       b.vehicle_id                      AS vehicle_id,
                       co.staff_id                       AS staff_id,
                       co.created_at                     AS check_out_at,
                       COALESCE(cnt.active_count, 0)     AS damage_count,
                       COALESCE(cnt.overridden_count, 0) AS overridden_count
                FROM bookings b
                JOIN co ON co.booking_id = b.booking_id
                JOIN vehicles v ON v.vehicle_id = b.vehicle_id
                JOIN renters r ON r.renter_id = b.renter_id
                LEFT JOIN cnt ON cnt.session_id = co.session_id
                WHERE b.status = 'COMPLETED'
                  AND (CAST(:vehicleId AS uuid) IS NULL OR b.vehicle_id = CAST(:vehicleId AS uuid))
                  AND (CAST(:startAt AS timestamp) IS NULL OR co.created_at >= CAST(:startAt AS timestamp))
                  AND (CAST(:endAt AS timestamp) IS NULL OR co.created_at < CAST(:endAt AS timestamp))
            )
            """;

    private static final String SUMMARY_SQL = SCOPED_RETURNS_CTE + """
            SELECT COUNT(*)                                          AS total_returns,
                   COUNT(*) FILTER (WHERE damage_count > 0)          AS damaged_returns,
                   COALESCE(SUM(damage_count), 0)                    AS total_confirmed_damages,
                   COALESCE(SUM(damage_count + overridden_count), 0) AS total_ai_detections,
                   COALESCE(SUM(overridden_count), 0)                AS rejected_ai_count
            FROM scoped
            """;

    private static final String MONTHLY_TREND_SQL = SCOPED_RETURNS_CTE + """
            SELECT to_char(check_out_at, 'YYYY-MM')         AS month,
                   COUNT(*)                                 AS total_returns,
                   COUNT(*) FILTER (WHERE damage_count > 0) AS damaged_returns
            FROM scoped
            GROUP BY to_char(check_out_at, 'YYYY-MM')
            ORDER BY month ASC
            """;

    private static final String DAMAGE_BREAKDOWN_SQL = SCOPED_RETURNS_CTE + """
            SELECT d.damage_type,
                   COUNT(*) AS damage_count
            FROM scoped s
            JOIN inspection_images i ON i.session_id = s.check_out_session_id
            JOIN damage_detections d ON d.image_id = i.image_id
            WHERE d.is_overridden IS NOT TRUE
            GROUP BY d.damage_type
            ORDER BY damage_count DESC, d.damage_type ASC
            """;

    private static final String TOP_DAMAGED_VEHICLES_SQL = SCOPED_RETURNS_CTE + """
            ,
            confirmed_damages AS (
                SELECT s.vehicle_id,
                       d.damage_type,
                       NULLIF(TRIM(d.part_name), '') AS part_name
                FROM scoped s
                JOIN inspection_images i ON i.session_id = s.check_out_session_id
                JOIN damage_detections d ON d.image_id = i.image_id
                WHERE d.is_overridden IS NOT TRUE
            ),
            vehicle_top_damage AS (
                SELECT vehicle_id,
                       MODE() WITHIN GROUP (ORDER BY damage_type) AS most_common_damage_type,
                       MODE() WITHIN GROUP (ORDER BY part_name) FILTER (WHERE part_name IS NOT NULL) AS most_common_part
                FROM confirmed_damages
                GROUP BY vehicle_id
            )
            SELECT v.vehicle_id,
                   v.model,
                   v.license_plate,
                   v.avatar_url,
                   v.status,
                   COUNT(*) FILTER (WHERE s.damage_count > 0) AS damaged_returns,
                   COALESCE(SUM(s.damage_count), 0)           AS total_confirmed_damages,
                   vtd.most_common_damage_type,
                   vtd.most_common_part
            FROM scoped s
            JOIN vehicles v ON v.vehicle_id = s.vehicle_id
            LEFT JOIN vehicle_top_damage vtd ON vtd.vehicle_id = v.vehicle_id
            GROUP BY v.vehicle_id, v.model, v.license_plate, v.avatar_url, v.status,
                     vtd.most_common_damage_type, vtd.most_common_part
            HAVING COALESCE(SUM(s.damage_count), 0) > 0
            ORDER BY total_confirmed_damages DESC, damaged_returns DESC, v.license_plate ASC
            LIMIT 10
            """;

    private static final String STAFF_AI_REVIEW_SQL = SCOPED_RETURNS_CTE + """
            SELECT s.staff_id,
                   COALESCE(u.name, 'Không rõ')                          AS staff_name,
                   COUNT(*)                                              AS total_returns,
                   COALESCE(SUM(s.damage_count + s.overridden_count), 0) AS total_ai_detections,
                   COALESCE(SUM(s.overridden_count), 0)                  AS rejected_ai_count
            FROM scoped s
            LEFT JOIN users u ON u.user_id = s.staff_id
            GROUP BY s.staff_id, u.name
            ORDER BY CASE
                         WHEN COALESCE(SUM(s.damage_count + s.overridden_count), 0) > 0
                         THEN (COALESCE(SUM(s.overridden_count), 0)::double precision /
                               COALESCE(SUM(s.damage_count + s.overridden_count), 0))
                         ELSE 0
                     END DESC,
                     total_returns DESC,
                     lower(COALESCE(u.name, '')) ASC
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public Summary fetchSummary(Scope scope) {
        Summary result = jdbc.queryForObject(SUMMARY_SQL, toParams(scope), (rs, rowNum) -> Summary.of(
                rs.getLong("total_returns"),
                rs.getLong("damaged_returns"),
                rs.getLong("total_confirmed_damages"),
                rs.getLong("total_ai_detections"),
                rs.getLong("rejected_ai_count")
        ));
        return result != null ? result : Summary.of(0L, 0L, 0L, 0L, 0L);
    }

    public Map<String, MonthlyCountRow> fetchMonthlyCounts(LocalDateTime startAt, LocalDateTime endAt, UUID vehicleId) {
        List<MonthlyCountRow> rows = jdbc.query(
                MONTHLY_TREND_SQL,
                toParams(new Scope(startAt, endAt, vehicleId)),
                (rs, rowNum) -> new MonthlyCountRow(
                        rs.getString("month"),
                        rs.getLong("total_returns"),
                        rs.getLong("damaged_returns")
                )
        );
        Map<String, MonthlyCountRow> map = new HashMap<>(rows.size());
        for (MonthlyCountRow row : rows) {
            map.put(row.month(), row);
        }
        return map;
    }

    public List<DamageCountRow> fetchDamageBreakdown(Scope scope) {
        return jdbc.query(
                DAMAGE_BREAKDOWN_SQL,
                toParams(scope),
                (rs, rowNum) -> new DamageCountRow(
                        rs.getString("damage_type"),
                        rs.getLong("damage_count")
                )
        );
    }

    public List<TopDamagedVehicleItem> fetchTopDamagedVehicles(Scope scope) {
        return jdbc.query(
                TOP_DAMAGED_VEHICLES_SQL,
                toParams(scope),
                (rs, rowNum) -> new TopDamagedVehicleItem(
                        rs.getObject("vehicle_id", UUID.class),
                        rs.getString("model"),
                        rs.getString("license_plate"),
                        rs.getString("avatar_url"),
                        rs.getString("status"),
                        rs.getLong("damaged_returns"),
                        rs.getLong("total_confirmed_damages"),
                        rs.getString("most_common_damage_type"),
                        rs.getString("most_common_part")
                )
        );
    }

    public List<StaffAiReviewStatItem> fetchStaffAiReviewStats(Scope scope) {
        return jdbc.query(
                STAFF_AI_REVIEW_SQL,
                toParams(scope),
                (rs, rowNum) -> StaffAiReviewStatItem.of(
                        rs.getObject("staff_id", UUID.class),
                        rs.getString("staff_name"),
                        rs.getLong("total_returns"),
                        rs.getLong("total_ai_detections"),
                        rs.getLong("rejected_ai_count")
                )
        );
    }

    private static MapSqlParameterSource toParams(Scope scope) {
        return new MapSqlParameterSource()
                .addValue("vehicleId", scope.vehicleId() != null ? scope.vehicleId().toString() : null, Types.VARCHAR)
                .addValue("startAt", scope.startAt() != null ? Timestamp.valueOf(scope.startAt()) : null, Types.TIMESTAMP)
                .addValue("endAt", scope.endAt() != null ? Timestamp.valueOf(scope.endAt()) : null, Types.TIMESTAMP);
    }
}
