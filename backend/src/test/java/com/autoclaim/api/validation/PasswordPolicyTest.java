package com.autoclaim.api.validation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordPolicyTest {

    @Test
    void acceptsStrongPassword() {
        List<String> errors = PasswordPolicy.validate("Xk9#mP2q!v", "khoa.dang@autoclaim.vn", "Đặng Văn Khoa");
        assertTrue(errors.isEmpty(), () -> "Expected no errors, got: " + errors);
    }

    @Test
    void acceptsBoundaryLengthsSixAndTwelve() {
        assertTrue(PasswordPolicy.validate("Xk9#mP", "an@autoclaim.vn", "Lê An").isEmpty());
        assertTrue(PasswordPolicy.validate("Xk9#mP2q!vR7", "an@autoclaim.vn", "Lê An").isEmpty());
    }

    @Test
    void rejectsTooShortOrTooLong() {
        assertFalse(PasswordPolicy.validate("Xk9#m", "user@autoclaim.vn", "Nguyễn Văn A").isEmpty());
        assertFalse(PasswordPolicy.validate("Xk9#mP2q!vR7Z", "user@autoclaim.vn", "Nguyễn Văn A").isEmpty());
    }

    @Test
    void rejectsMissingCharacterClasses() {
        assertFalse(PasswordPolicy.validate("xk9#mp2q", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("XK9#MP2Q", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Xk@#mPqR", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Xk9mP2qR", "user@autoclaim.vn", "Trần Bình").isEmpty());
    }

    @Test
    void rejectsWhitespace() {
        assertFalse(PasswordPolicy.validate(" Xk9#mP2q", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Xk9# mP2", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Xk9#mP2 ", "user@autoclaim.vn", "Trần Bình").isEmpty());
    }

    @Test
    void rejectsEmailLocalPartAndSegments() {
        assertFalse(PasswordPolicy.validate("Khoa@123!", "khoa.dang@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Dang#9x", "khoa.dang@autoclaim.vn", "Trần Bình").isEmpty());
    }

    @Test
    void rejectsVietnameseFullNameIgnoringDiacritics() {
        assertFalse(PasswordPolicy.validate("Phuong@9x", "user@autoclaim.vn", "Nguyễn Thị Phương").isEmpty());
        assertFalse(PasswordPolicy.validate("Doanh#7k", "user@autoclaim.vn", "Phan Công Doanh").isEmpty());
        assertFalse(PasswordPolicy.validate("Dang#7k", "user@autoclaim.vn", "Đặng Minh").isEmpty());
    }

    @Test
    void rejectsCommonPasswordsCaseInsensitively() {
        assertFalse(PasswordPolicy.validate("Password@123", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("admin@123", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("Admin@123", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("123456aA@", "user@autoclaim.vn", "Trần Bình").isEmpty());
        assertFalse(PasswordPolicy.validate("AutoClaim@123", "user@autoclaim.vn", "Trần Bình").isEmpty());
    }
}
