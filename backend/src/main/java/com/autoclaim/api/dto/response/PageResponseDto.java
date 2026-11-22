package com.autoclaim.api.dto.response;

import java.util.List;

/** One page of a server-side paginated list ({@code page} is 0-based). */
public record PageResponseDto<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {

    public static <T> PageResponseDto<T> of(List<T> items, int page, int size, long totalItems) {
        int totalPages = size > 0 ? (int) ((totalItems + size - 1) / size) : 0;
        return new PageResponseDto<>(items, page, size, totalItems, totalPages);
    }
}
