package com.autoclaim.api.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Non-blocking JWT filter: when a request carries a valid {@code Authorization: Bearer <token>}, the
 * user (principal name = email claim) is put into the {@code SecurityContext}. A missing, invalid or
 * expired token is simply ignored — this filter never rejects a request; access rules stay in
 * {@code SecurityConfig}.
 *
 * <p>Not a Spring bean on purpose, so Spring Boot does not also register it as a global servlet filter.
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtService.parseToken(header.substring(BEARER_PREFIX.length()).trim())
                    .ifPresent(claims -> authenticate(claims, request));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(Claims claims, HttpServletRequest request) {
        String email = claims.get("email", String.class);
        if (!StringUtils.hasText(email)) {
            return;
        }
        String role = claims.get("role", String.class);
        List<SimpleGrantedAuthority> authorities = StringUtils.hasText(role)
                ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                : List.of();

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(email, null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
