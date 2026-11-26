package com.autoclaim.api.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Aggregated inspection statistics response for {@code GET /api/v1/statistics}.
 * All figures are computed directly from completed check-out sessions in the database,
 * using the exact same rules as the inspection history endpoints.
 */
public record StatisticsResponseDto(
        Summary summary,
        List<MonthlyTrendItem> monthlyTrend,
        List<DamageBreakdownItem> damageBreakdown,
        List<TopDamagedVehicleItem> topDamagedVehicles,
        List<StaffAiReviewStatItem> staffAiReviewStats
) {

    public record Summary(
            long totalReturns,
            long damagedReturns,
            long cleanReturns,
            double damageRatePercent,
            long totalConfirmedDamages,
            long totalAiDetections,
            long rejectedAiCount,
            double aiAccuracyPercent
    ) {
        public static Summary of(long totalReturns,
                                 long damagedReturns,
                                 long totalConfirmedDamages,
                                 long totalAiDetections,
                                 long rejectedAiCount) {
            long cleanReturns = Math.max(0L, totalReturns - damagedReturns);
            double damageRatePercent = totalReturns > 0
                    ? round1((damagedReturns * 100.0) / totalReturns)
                    : 0.0;
            double aiAccuracyPercent = totalAiDetections > 0
                    ? round1(((totalAiDetections - rejectedAiCount) * 100.0) / totalAiDetections)
                    : 0.0;
            return new Summary(
                    totalReturns,
                    damagedReturns,
                    cleanReturns,
                    damageRatePercent,
                    totalConfirmedDamages,
                    totalAiDetections,
                    rejectedAiCount,
                    aiAccuracyPercent
            );
        }
    }

    public record MonthlyTrendItem(
            String month,
            String monthLabel,
            long totalReturns,
            long cleanReturns,
            long damagedReturns
    ) {
    }

    public record DamageBreakdownItem(
            String damageType,
            String damageLabel,
            long count,
            double percentage
    ) {
    }

    public record TopDamagedVehicleItem(
            UUID vehicleId,
            String model,
            String licensePlate,
            String avatarUrl,
            String status,
            long damagedReturns,
            long totalConfirmedDamages,
            String mostCommonDamageType,
            String mostCommonPart
    ) {
    }

    public record StaffAiReviewStatItem(
            UUID staffId,
            String staffName,
            long totalReturns,
            long totalAiDetections,
            long rejectedAiCount,
            double rejectionRatePercent
    ) {
        public static StaffAiReviewStatItem of(UUID staffId,
                                               String staffName,
                                               long totalReturns,
                                               long totalAiDetections,
                                               long rejectedAiCount) {
            double rejectionRatePercent = totalAiDetections > 0
                    ? round1((rejectedAiCount * 100.0) / totalAiDetections)
                    : 0.0;
            return new StaffAiReviewStatItem(
                    staffId,
                    staffName,
                    totalReturns,
                    totalAiDetections,
                    rejectedAiCount,
                    rejectionRatePercent
            );
        }
    }

    public static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
