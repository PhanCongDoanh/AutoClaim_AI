package com.autoclaim.api.repository;

import com.autoclaim.api.entity.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InspectionImageRepository extends JpaRepository<InspectionImage, UUID> {

    List<InspectionImage> findBySession_SessionId(UUID sessionId);
}
