package com.autoclaim.api.service;

import com.autoclaim.api.dto.response.HistoryStaffOptionDto;
import com.autoclaim.api.dto.response.InspectionHistoryItemDto;
import com.autoclaim.api.dto.response.InspectionHistorySummaryDto;
import com.autoclaim.api.dto.response.PageResponseDto;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.repository.InspectionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Inspection history (returned rentals) for dispute handling, shared by the staff page and the admin page (which adds
 * the staff / override filters and the summary). Read-only.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InspectionHistoryService {

    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 50;

    private static final Set<String> RESULTS = Set.of("ALL", "DAMAGED", "CLEAN");
    private static final Pattern MONTH = Pattern.compile("\\d{4}-(0[1-9]|1[0-2])");

    private final InspectionHistoryRepository historyRepository;

    /** Staff page: no staff / override filter. */
    public PageResponseDto<InspectionHistoryItemDto> getHistory(String search, String result, String month,
                                                                Integer page, Integer size) {
        return getHistory(search, result, month, null, false, page, size);
    }

    /**
     * @param search      case/accent-insensitive match on license plate, vehicle model or renter name (blank = all)
     * @param result      ALL | DAMAGED | CLEAN, based on damages not rejected by staff (blank = ALL)
     * @param month       "YYYY-MM" of the check-out time (blank = all time)
     * @param staffId     staff of the CHECK_OUT session (null = everyone)
     * @param hasOverride true = only returns with at least one detection rejected by staff
     * @param page        0-based
     * @param size        1..50, default 10
     */
    public PageResponseDto<InspectionHistoryItemDto> getHistory(String search, String result, String month,
                                                                UUID staffId, boolean hasOverride,
                                                                Integer page, Integer size) {
        String normalizedResult = StringUtils.hasText(result) ? result.trim().toUpperCase(Locale.ROOT) : "ALL";
        if (!RESULTS.contains(normalizedResult)) {
            throw new BadRequestException("Bộ lọc kết quả không hợp lệ: '%s' (chỉ nhận ALL, DAMAGED, CLEAN)."
                    .formatted(result));
        }

        int pageIndex = page == null ? 0 : page;
        if (pageIndex < 0) {
            throw new BadRequestException("Số trang không được âm.");
        }
        int pageSize = size == null ? DEFAULT_PAGE_SIZE : size;
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new BadRequestException("Số dòng mỗi trang phải từ 1 đến %d.".formatted(MAX_PAGE_SIZE));
        }

        InspectionHistoryRepository.Filter filter = new InspectionHistoryRepository.Filter(
                toLikePattern(search), normalizedResult, normalizeMonth(month), staffId, hasOverride);

        long totalItems = historyRepository.count(filter);
        List<InspectionHistoryItemDto> items = totalItems == 0
                ? List.of()
                : historyRepository.findPage(filter, pageSize, (long) pageIndex * pageSize);
        return PageResponseDto.of(items, pageIndex, pageSize, totalItems);
    }

    /** Admin summary cards over search / month / staff (the result and override filters do not apply). */
    public InspectionHistorySummaryDto getSummary(String search, String month, UUID staffId) {
        return historyRepository.summarize(new InspectionHistoryRepository.Filter(
                toLikePattern(search), "ALL", normalizeMonth(month), staffId, false));
    }

    /** "YYYY-MM" months with at least one returned rental, newest first. */
    public List<String> getMonths() {
        return historyRepository.findMonths();
    }

    /** Everyone who ran a CHECK_OUT session (soft-deleted users and admins included), sorted by name. */
    public List<HistoryStaffOptionDto> getCheckOutStaff() {
        return historyRepository.findCheckOutStaff();
    }

    private static String normalizeMonth(String month) {
        String normalized = StringUtils.hasText(month) ? month.trim() : "";
        if (!normalized.isEmpty() && !MONTH.matcher(normalized).matches()) {
            throw new BadRequestException("Tháng không hợp lệ: '%s' (định dạng YYYY-MM).".formatted(month));
        }
        return normalized;
    }

    /** "%term%" with LIKE wildcards escaped (escape char '\'), or "" when there is no search term. */
    private static String toLikePattern(String search) {
        if (!StringUtils.hasText(search)) {
            return "";
        }
        String escaped = search.trim()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
