package com.autoclaim.api.config;

import com.autoclaim.api.entity.Role;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.entity.enums.RoleName;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.RoleRepository;
import com.autoclaim.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedUser("admin@autoclaim.vn", "Quản trị viên Hệ thống", RoleName.ADMIN);
        seedUser("staff@autoclaim.vn", "Nhân viên Kiểm định", RoleName.STAFF);
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
