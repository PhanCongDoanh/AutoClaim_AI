package com.autoclaim.api.repository;

import com.autoclaim.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByUserIdAndIsDeletedFalse(UUID userId);

    boolean existsByEmail(String email);

    List<User> findByIsDeletedFalse();

    List<User> findByIsDeletedFalseOrderByCreatedAtDesc();
}
