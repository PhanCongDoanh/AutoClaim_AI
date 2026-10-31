package com.autoclaim.api.dto.response;

import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.enums.RoleName;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record StaffResponseDto(
        UUID userId,
        String name,
        String email,
        String phone,
        RoleName roleName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static StaffResponseDto fromEntity(User user) {
        return StaffResponseDto.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roleName(user.getRole() != null ? user.getRole().getRoleName() : null)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
