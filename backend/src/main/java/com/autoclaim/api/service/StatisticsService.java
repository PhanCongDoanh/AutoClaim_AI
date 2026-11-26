package com.autoclaim.api.service;

import com.autoclaim.api.dto.response.StatisticsResponseDto;
import com.autoclaim.api.dto.response.StatisticsResponseDto.DamageBreakdownItem;
import com.autoclaim.api.dto.response.StatisticsResponseDto.MonthlyTrendItem;
import com.autoclaim.api.dto.response.StatisticsResponseDto.StaffAiReviewStatItem;
import com.autoclaim.api.dto.response.StatisticsResponseDto.Summary;
import com.autoclaim.api.dto.response.StatisticsResponseDto.TopDamagedVehicleItem;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.repository.StatisticsRepository;
import com.autoclaim.api.repository.StatisticsRepository.DamageCountRow;
import com.autoclaim.api.repository.StatisticsRepository.MonthlyCountRow;
import com.autoclaim.api.repository.StatisticsRepository.Scope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Read-only statistics service backed 100% by real database records, consistent with {@link InspectionHistoryService}.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private static final Pattern YEAR_MONTH_PATTERN = Pattern.compile("\\d{4}-(0[1-9]|1[0-2])");
    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final int TREND_MONTH_COUNT = 6;

    private final StatisticsRepository statisticsRepository;

    /**
     * Computes dashboard statistics for the given month/period and optional vehicle filter.
     *
     * @param month     optional filter: {@code YYYY-MM} (e.g. {@code 2026-11}), {@code all} (or blank = all time),
     *                  {@code last_3_months}, or {@code last_6_months}
     * @param vehicleId optional vehicle UUID to narrow all metrics and charts to a single vehicle
     */
    public StatisticsResponseDto getStatistics(String month, UUID vehicleId) {
        ResolvedRange range = resolveRange(month);
        Scope scope = new Scope(range.startAt(), range.endAt(), vehicleId);

        Summary summary = statisticsRepository.fetchSummary(scope);

        // 6-month trend always covers the 6 consecutive calendar months ending at anchorMonth.
        YearMonth trendStartMonth = range.anchorMonth().minusMonths(TREND_MONTH_COUNT - 1L);
        LocalDateTime trendStartAt = trendStartMonth.atDay(1).atStartOfDay();
        LocalDateTime trendEndAt = range.anchorMonth().plusMonths(1L).atDay(1).atStartOfDay();
        Map<String, MonthlyCountRow> monthlyCounts =
                statisticsRepository.fetchMonthlyCounts(trendStartAt, trendEndAt, vehicleId);

        List<MonthlyTrendItem> monthlyTrend = new ArrayList<>(TREND_MONTH_COUNT);
        for (int i = 0; i < TREND_MONTH_COUNT; i++) {
            YearMonth current = trendStartMonth.plusMonths(i);
            String key = current.format(YEAR_MONTH_FORMATTER);
            MonthlyCountRow row = monthlyCounts.get(key);
            long total = row != null ? row.totalReturns() : 0L;
            long damaged = row != null ? row.damagedReturns() : 0L;
            long clean = Math.max(0L, total - damaged);
            monthlyTrend.add(new MonthlyTrendItem(
                    key,
                    "Th" + current.getMonthValue(),
                    total,
                    clean,
                    damaged
            ));
        }

        List<DamageCountRow> rawBreakdown = statisticsRepository.fetchDamageBreakdown(scope);
        long totalConfirmedDamages = summary.totalConfirmedDamages();
        List<DamageBreakdownItem> damageBreakdown = rawBreakdown.stream()
                .map(row -> new DamageBreakdownItem(
                        row.damageType(),
                        InspectionLabels.damageLabel(row.damageType()),
                        row.count(),
                        totalConfirmedDamages > 0
                                ? StatisticsResponseDto.round1((row.count() * 100.0) / totalConfirmedDamages)
                                : 0.0
                ))
                .toList();

        List<TopDamagedVehicleItem> topDamagedVehicles = statisticsRepository.fetchTopDamagedVehicles(scope);
        List<StaffAiReviewStatItem> staffAiReviewStats = statisticsRepository.fetchStaffAiReviewStats(scope);

        return new StatisticsResponseDto(
                summary,
                monthlyTrend,
                damageBreakdown,
                topDamagedVehicles,
                staffAiReviewStats
        );
    }

    private record ResolvedRange(LocalDateTime startAt, LocalDateTime endAt, YearMonth anchorMonth) {
    }

    private static ResolvedRange resolveRange(String month) {
        YearMonth nowMonth = YearMonth.now();
        if (!StringUtils.hasText(month)) {
            return new ResolvedRange(null, null, nowMonth);
        }

        String normalized = month.trim().toLowerCase(Locale.ROOT);
        if ("all".equals(normalized)) {
            return new ResolvedRange(null, null, nowMonth);
        }
        if ("last_3_months".equals(normalized)) {
            LocalDateTime startAt = nowMonth.minusMonths(2L).atDay(1).atStartOfDay();
            LocalDateTime endAt = nowMonth.plusMonths(1L).atDay(1).atStartOfDay();
            return new ResolvedRange(startAt, endAt, nowMonth);
        }
        if ("last_6_months".equals(normalized)) {
            LocalDateTime startAt = nowMonth.minusMonths(5L).atDay(1).atStartOfDay();
            LocalDateTime endAt = nowMonth.plusMonths(1L).atDay(1).atStartOfDay();
            return new ResolvedRange(startAt, endAt, nowMonth);
        }
        if (!YEAR_MONTH_PATTERN.matcher(normalized).matches()) {
            throw new BadRequestException(
                    "Tham số tháng không hợp lệ: '%s' (chấp nhận YYYY-MM, all, last_3_months, last_6_months)."
                            .formatted(month));
        }

        YearMonth target = YearMonth.parse(normalized, YEAR_MONTH_FORMATTER);
        return new ResolvedRange(
                target.atDay(1).atStartOfDay(),
                target.plusMonths(1L).atDay(1).atStartOfDay(),
                target
        );
    }
}
