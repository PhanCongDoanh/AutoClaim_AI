package com.autoclaim.api.controller.admin;

import com.autoclaim.api.dto.response.HistoryStaffOptionDto;
import com.autoclaim.api.dto.response.InspectionHistoryItemDto;
import com.autoclaim.api.dto.response.InspectionHistorySummaryDto;
import com.autoclaim.api.dto.response.PageResponseDto;
import com.autoclaim.api.service.InspectionHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Read-only inspection history for admins: the staff history plus monitoring filters and a summary. */
@RestController
@RequestMapping("/api/admin/inspections/history")
@RequiredArgsConstructor
@Tag(name = "Admin – Inspection history", description = "Monitoring of returned rentals and AI overrides")
public class AdminInspectionHistoryController {

    private final InspectionHistoryService historyService;

    @Operation(
            summary = "Inspection history (admin)",
            description = "Same parameters and page format as GET /api/inspections/history, plus staffId (staff of the "
                    + "CHECK_OUT session) and hasOverride (true = only returns with at least one AI detection rejected "
                    + "by staff). Rows include checkOutStaffName and checkInStaffName."
    )
    @GetMapping
    public ResponseEntity<PageResponseDto<InspectionHistoryItemDto>> getHistory(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) UUID staffId,
            @RequestParam(defaultValue = "false") boolean hasOverride,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.ok(historyService.getHistory(search, result, month, staffId, hasOverride, page, size));
    }

    @Operation(
            summary = "Inspection history summary (admin)",
            description = "Totals over search / month / staffId (result and hasOverride are ignored): returns, damaged "
                    + "and clean returns, AI detections (including rejected ones), rejected detections and "
                    + "overrideRate = overriddenDetections / aiDetections (0 when there is none)."
    )
    @GetMapping("/summary")
    public ResponseEntity<InspectionHistorySummaryDto> getSummary(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) UUID staffId) {
        return ResponseEntity.ok(historyService.getSummary(search, month, staffId));
    }

    @Operation(
            summary = "Staff who ran check-outs (admin)",
            description = "Every user with at least one CHECK_OUT session, soft-deleted users and admins included, "
                    + "sorted by name: { userId, fullName, deleted, roleName }."
    )
    @GetMapping("/staff")
    public ResponseEntity<List<HistoryStaffOptionDto>> getCheckOutStaff() {
        return ResponseEntity.ok(historyService.getCheckOutStaff());
    }
}
