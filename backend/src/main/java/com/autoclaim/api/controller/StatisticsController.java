package com.autoclaim.api.controller;

import com.autoclaim.api.dto.response.StatisticsResponseDto;
import com.autoclaim.api.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Aggregated inspection statistics derived directly from completed check-out sessions in the database. */
@RestController
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
@Tag(name = "Statistics", description = "Aggregated inspection, damage breakdown, and AI accuracy statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    @Operation(
            summary = "Get inspection statistics",
            description = "Returns KPI summary, 6-month return trend, confirmed damage breakdown, top damaged vehicles, "
                    + "and staff AI review statistics. Uses the same completed-return criteria as inspection history."
    )
    @GetMapping
    public ResponseEntity<StatisticsResponseDto> getStatistics(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) UUID vehicleId) {
        return ResponseEntity.ok(statisticsService.getStatistics(month, vehicleId));
    }
}
