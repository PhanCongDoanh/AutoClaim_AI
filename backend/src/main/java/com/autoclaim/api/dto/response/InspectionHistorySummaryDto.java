package com.autoclaim.api.dto.response;

/**
 * Admin history summary (GET /api/admin/inspections/history/summary) over the search / month / staff filters.
 *
 * @param aiDetections         every detection the AI saved, including the ones rejected by staff
 * @param overriddenDetections detections rejected by staff as AI mistakes
 * @param overrideRate         overriddenDetections / aiDetections, 0 when there is no detection
 */
public record InspectionHistorySummaryDto(
        long totalReturns,
        long damagedReturns,
        long cleanReturns,
        long aiDetections,
        long overriddenDetections,
        double overrideRate
) {

    public static InspectionHistorySummaryDto of(long totalReturns, long damagedReturns,
                                                 long aiDetections, long overriddenDetections) {
        double rate = aiDetections > 0 ? (double) overriddenDetections / aiDetections : 0.0;
        return new InspectionHistorySummaryDto(totalReturns, damagedReturns, totalReturns - damagedReturns,
                aiDetections, overriddenDetections, rate);
    }
}
