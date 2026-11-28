package com.autoclaim.api.config;

import com.autoclaim.api.entity.Role;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.VehicleReferenceImage;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.RoleName;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.RoleRepository;
import com.autoclaim.api.repository.UserRepository;
import com.autoclaim.api.repository.VehicleReferenceImageRepository;
import com.autoclaim.api.repository.VehicleRepository;
import com.autoclaim.api.service.S3StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";

    public static final Map<AngleCode, String> REFERENCE_FILES = Map.of(
            AngleCode.ANGLE_1, "reference_images/1_front.jpg",
            AngleCode.ANGLE_2, "reference_images/8_front_left.jpg",
            AngleCode.ANGLE_3, "reference_images/7_left.jpg",
            AngleCode.ANGLE_4, "reference_images/6_rear_left.jpg",
            AngleCode.ANGLE_5, "reference_images/5_rear.jpg",
            AngleCode.ANGLE_6, "reference_images/4_rear_right.jpg",
            AngleCode.ANGLE_7, "reference_images/3_right.jpg",
            AngleCode.ANGLE_8, "reference_images/2_front_right.jpg"
    );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final VehicleRepository vehicleRepository;
    private final VehicleReferenceImageRepository vehicleReferenceImageRepository;
    private final S3StorageService s3StorageService;

    @Override
    @Transactional
    public void run(String... args) {
        seedUser("admin@autoclaim.vn", "Quản trị viên Hệ thống", RoleName.ADMIN);
        seedUser("staff@autoclaim.vn", "Nhân viên Kiểm định", RoleName.STAFF);
        seedVehicleReferenceImages();
    }

    private void seedVehicleReferenceImages() {
        try {
            List<Vehicle> vehicles = vehicleRepository.findAll();
            if (vehicles.isEmpty()) {
                return;
            }

            // Check if any vehicle is missing references
            boolean needsSeeding = vehicles.stream().anyMatch(
                    v -> vehicleReferenceImageRepository.findByVehicle_VehicleId(v.getVehicleId()).size() < 8);
            if (!needsSeeding) {
                return;
            }

            // Upload standard reference images to S3
            Map<AngleCode, String> standardUrls = new EnumMap<>(AngleCode.class);
            for (Map.Entry<AngleCode, String> entry : REFERENCE_FILES.entrySet()) {
                AngleCode angle = entry.getKey();
                String path = entry.getValue();
                ClassPathResource resource = new ClassPathResource(path);
                if (resource.exists()) {
                    try (InputStream in = resource.getInputStream()) {
                        byte[] bytes = in.readAllBytes();
                        String url = s3StorageService.uploadBytes(
                                bytes, "vehicles/references/standard", angle.name() + ".jpg", "image/jpeg");
                        standardUrls.put(angle, url);
                    }
                }
            }

            if (standardUrls.size() < 8) {
                log.warn("Could not upload all 8 reference images (uploaded {}), skipping DB seeding", standardUrls.size());
                return;
            }

            for (Vehicle vehicle : vehicles) {
                for (AngleCode angle : REFERENCE_FILES.keySet()) {
                    if (vehicleReferenceImageRepository.findByVehicle_VehicleIdAndAngleCode(vehicle.getVehicleId(), angle).isEmpty()) {
                        vehicleReferenceImageRepository.save(VehicleReferenceImage.builder()
                                .vehicle(vehicle)
                                .angleCode(angle)
                                .imageUrl(standardUrls.get(angle))
                                .build());
                    }
                }
            }
            log.info("Successfully seeded 8 reference images for {} vehicles", vehicles.size());
        } catch (Exception ex) {
            log.warn("Could not seed vehicle reference images: {}", ex.getMessage());
        }
    }

    private void seedUser(String email, String name, RoleName roleName) {
        if (userRepository.existsByEmail(email)) {
            return;
        }

        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role", roleName));

        userRepository.save(User.builder()
                .email(email)
                .name(name)
                .role(role)
                .password(passwordEncoder.encode(DEFAULT_PASSWORD))
                .isDeleted(false)
                .build());

        log.info("Seeded default {} account: {}", roleName, email);
    }
}
