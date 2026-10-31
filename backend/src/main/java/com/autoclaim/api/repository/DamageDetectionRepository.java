package com.autoclaim.api.repository;

import com.autoclaim.api.entity.DamageDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DamageDetectionRepository extends JpaRepository<DamageDetection, UUID> {

    List<DamageDetection> findByImage_Session_SessionId(UUID sessionId);

    List<DamageDetection> findByImage_ImageId(UUID imageId);
}
