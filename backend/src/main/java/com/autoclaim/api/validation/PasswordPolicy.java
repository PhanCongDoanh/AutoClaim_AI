package com.autoclaim.api.validation;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Shared password policy for staff/admin account creation.
 * Rules are mirrored in {@code frontend/src/lib/passwordPolicy.ts}.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 6;
    public static final int MAX_LENGTH = 12;
    public static final String SPECIAL_CHARS = "@$!%*?&#^()_+-=";

    private static final Pattern WHITESPACE = Pattern.compile("\\s");
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[@$!%*?&#^()_+\\-=]");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password@123",
            "admin@123",
            "123456aa@",
            "autoclaim@123",
            "admin@1",
            "admin@12",
            "abc@123",
            "pass@123",
            "staff@123",
            "qwerty@123",
            "welcome@1",
            "p@ssword1",
            "p@ssw0rd"
    );

    private PasswordPolicy() {
    }

    /**
     * Validates a raw password against all policy rules.
     * Never includes the raw password value in returned messages.
     */
    public static List<String> validate(String password, String email, String fullName) {
        List<String> violations = new ArrayList<>();

        if (password == null || password.isEmpty()) {
            violations.add("Vui lòng nhập mật khẩu.");
            return violations;
        }

        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            violations.add("Mật khẩu phải có từ %d đến %d ký tự.".formatted(MIN_LENGTH, MAX_LENGTH));
        }

        if (WHITESPACE.matcher(password).find()) {
            violations.add("Mật khẩu không được chứa khoảng trắng.");
        }

        if (!UPPERCASE.matcher(password).find()) {
            violations.add("Mật khẩu cần ít nhất 1 chữ cái viết hoa (A-Z).");
        }

        if (!LOWERCASE.matcher(password).find()) {
            violations.add("Mật khẩu cần ít nhất 1 chữ cái viết thường (a-z).");
        }

        if (!DIGIT.matcher(password).find()) {
            violations.add("Mật khẩu cần ít nhất 1 chữ số (0-9).");
        }

        if (!SPECIAL.matcher(password).find()) {
            violations.add("Mật khẩu cần ít nhất 1 ký tự đặc biệt (%s).".formatted(SPECIAL_CHARS));
        }

        if (containsPersonalInfo(password, email, fullName)) {
            violations.add("Mật khẩu không được chứa tên hoặc thông tin từ email đăng nhập.");
        }

        if (isCommonPassword(password)) {
            violations.add("Mật khẩu này quá phổ biến, vui lòng chọn mật khẩu khác.");
        }

        return violations;
    }

    public static boolean isCommonPassword(String password) {
        if (password == null) {
            return false;
        }
        return COMMON_PASSWORDS.contains(password.toLowerCase(Locale.ROOT));
    }

    public static boolean containsPersonalInfo(String password, String email, String fullName) {
        if (password == null || password.isEmpty()) {
            return false;
        }
        String normalizedPassword = normalize(password);

        for (String token : extractEmailTokens(email)) {
            if (normalizedPassword.contains(token)) {
                return true;
            }
        }

        for (String token : extractNameTokens(fullName)) {
            if (normalizedPassword.contains(token)) {
                return true;
            }
        }

        return false;
    }

    private static List<String> extractEmailTokens(String email) {
        List<String> tokens = new ArrayList<>();
        if (email == null || email.isBlank()) {
            return tokens;
        }
        String trimmed = email.trim();
        int atIndex = trimmed.indexOf('@');
        String localPart = atIndex >= 0 ? trimmed.substring(0, atIndex) : trimmed;
        String normalizedLocal = normalize(localPart);
        if (normalizedLocal.length() >= 3) {
            tokens.add(normalizedLocal);
        }
        for (String part : normalizedLocal.split("[._\\-]+")) {
            if (part.length() >= 3) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private static List<String> extractNameTokens(String fullName) {
        List<String> tokens = new ArrayList<>();
        if (fullName == null || fullName.isBlank()) {
            return tokens;
        }
        String normalized = normalize(fullName);
        String compact = normalized.replaceAll("\\s+", "");
        if (compact.length() >= 3) {
            tokens.add(compact);
        }
        for (String part : normalized.split("\\s+")) {
            if (part.length() >= 3) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    static String normalize(String text) {
        String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD);
        String withoutDiacritics = DIACRITICS.matcher(decomposed).replaceAll("");
        return withoutDiacritics
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
