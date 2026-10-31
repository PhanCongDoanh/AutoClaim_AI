package com.autoclaim.api.service.admin;

import com.autoclaim.api.dto.request.CreateStaffRequest;
import com.autoclaim.api.dto.request.UpdateStaffRequest;
import com.autoclaim.api.dto.response.StaffResponseDto;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.Role;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.RoleName;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.FileProcessingException;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.RoleRepository;
import com.autoclaim.api.repository.UserRepository;
import com.autoclaim.api.repository.VehicleRepository;
import com.autoclaim.api.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleService vehicleService;
    private final PasswordEncoder passwordEncoder;

    public List<StaffResponseDto> getAllStaff() {
        return userRepository.findByIsDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(StaffResponseDto::fromEntity)
                .toList();
    }

    public List<VehicleResponseDto> getAllVehicles() {
        return vehicleRepository.findByIsDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(vehicleService::toVehicleResponseDto)
                .toList();
    }

    @Transactional
    public VehicleResponseDto createVehicle(
            String model,
            String licensePlate,
            Integer seats,
            MultipartFile avatar) {

        validateVehicleInputs(model, licensePlate);
        String trimmedPlate = licensePlate.trim();

        if (vehicleRepository.existsByLicensePlateIgnoreCase(trimmedPlate)) {
            throw new BadRequestException("Vehicle with license plate '%s' already exists".formatted(trimmedPlate));
        }

        int finalSeats = (seats != null && seats > 0) ? seats : 5;
        byte[] avatarBytes = extractAvatarBytes(avatar);

        Vehicle vehicle = Vehicle.builder()
                .model(model.trim())
                .licensePlate(trimmedPlate)
                .seats(finalSeats)
                .avatarData(avatarBytes)
                .status(VehicleStatus.AVAILABLE)
                .isDeleted(false)
                .build();

        return VehicleResponseDto.fromEntity(vehicleRepository.saveAndFlush(vehicle));
    }

    @Transactional
    public VehicleResponseDto updateVehicle(
            UUID vehicleId,
            String model,
            String licensePlate,
            Integer seats,
            MultipartFile avatar) {

        validateVehicleInputs(model, licensePlate);
        String trimmedPlate = licensePlate.trim();

        Vehicle vehicle = vehicleRepository.findByVehicleIdAndIsDeletedFalse(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", vehicleId));

        if (vehicleRepository.existsByLicensePlateIgnoreCaseAndVehicleIdNot(trimmedPlate, vehicleId)) {
            throw new BadRequestException("Vehicle with license plate '%s' already exists".formatted(trimmedPlate));
        }

        vehicle.setModel(model.trim());
        vehicle.setLicensePlate(trimmedPlate);
        if (seats != null && seats > 0) {
            vehicle.setSeats(seats);
        }

        byte[] avatarBytes = extractAvatarBytes(avatar);
        if (avatarBytes != null) {
            vehicle.setAvatarData(avatarBytes);
        }

        return vehicleService.toVehicleResponseDto(vehicleRepository.saveAndFlush(vehicle));
    }

    @Transactional
    public StaffResponseDto createStaff(CreateStaffRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("User with email '%s' already exists".formatted(email));
        }

        RoleName roleName = request.roleName() != null ? request.roleName() : RoleName.STAFF;
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role", roleName));

        String rawPassword = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(rawPassword);

        User user = User.builder()
                .role(role)
                .name(request.name().trim())
                .email(email)
                .phone(request.phone() != null ? request.phone().trim() : null)
                .password(encodedPassword)
                .isDeleted(false)
                .build();

        return StaffResponseDto.fromEntity(userRepository.saveAndFlush(user));
    }

    @Transactional
    public StaffResponseDto updateStaff(UUID userId, UpdateStaffRequest request) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff User", userId));

        user.setName(request.name().trim());
        user.setPhone(request.phone() != null ? request.phone().trim() : null);

        if (request.roleName() != null) {
            Role role = roleRepository.findByRoleName(request.roleName())
                    .orElseThrow(() -> new ResourceNotFoundException("Role", request.roleName()));
            user.setRole(role);
        }

        return StaffResponseDto.fromEntity(userRepository.saveAndFlush(user));
    }

    @Transactional
    public void deleteVehicle(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findByVehicleIdAndIsDeletedFalse(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", vehicleId));

        if (vehicle.getStatus() == VehicleStatus.RENTED) {
            throw new BadRequestException(
                    "Cannot delete vehicle %s while it is currently RENTED".formatted(vehicle.getLicensePlate()));
        }

        vehicle.setIsDeleted(true);
        vehicleRepository.saveAndFlush(vehicle);
    }

    @Transactional
    public void deleteStaff(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff User", userId));

        user.setIsDeleted(true);
        userRepository.saveAndFlush(user);
    }

    private void validateVehicleInputs(String model, String licensePlate) {
        if (!StringUtils.hasText(model)) {
            throw new BadRequestException("Vehicle model is required");
        }
        if (!StringUtils.hasText(licensePlate)) {
            throw new BadRequestException("License plate is required");
        }
    }

    private byte[] extractAvatarBytes(MultipartFile avatar) {
        if (avatar == null || avatar.isEmpty()) {
            return null;
        }
        try {
            return avatar.getBytes();
        } catch (IOException ex) {
            throw new FileProcessingException("Failed to convert vehicle avatar image to byte[]", ex);
        }
    }
}
