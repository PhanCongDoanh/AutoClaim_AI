package com.autoclaim.api.service;

import com.autoclaim.api.dto.request.LoginRequest;
import com.autoclaim.api.dto.response.LoginResponse;
import com.autoclaim.api.entity.User;
import com.autoclaim.api.exception.UnauthorizedException;
import com.autoclaim.api.repository.UserRepository;
import com.autoclaim.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findActiveByEmailWithRole(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return LoginResponse.builder()
                .token(jwtService.generateToken(user))
                .roleName(user.getRole().getRoleName())
                .email(user.getEmail())
                .fullName(user.getName())
                .build();
    }
}
