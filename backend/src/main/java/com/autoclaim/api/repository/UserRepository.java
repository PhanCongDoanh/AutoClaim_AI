package com.autoclaim.api.repository;

import com.autoclaim.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE LOWER(u.email) = LOWER(:email) AND u.isDeleted = false")
    Optional<User> findActiveByEmailWithRole(@Param("email") String email);

    Optional<User> findByUserIdAndIsDeletedFalse(UUID userId);

    boolean existsByEmail(String email);

    List<User> findByIsDeletedFalse();

    List<User> findByIsDeletedFalseOrderByCreatedAtDesc();
}
