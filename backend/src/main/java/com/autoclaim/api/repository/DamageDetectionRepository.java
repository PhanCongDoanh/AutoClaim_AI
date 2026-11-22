package com.autoclaim.api.repository;

import com.autoclaim.api.entity.DamageDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface DamageDetectionRepository extends JpaRepository<DamageDetection, UUID> {

    List<DamageDetection> findByImage_Session_SessionId(UUID sessionId);

    List<DamageDetection> findByImage_ImageId(UUID imageId);

    /** Damages not rejected by staff (is_overridden false or null) of several sessions, image fetched. */
    @Query("""
            select d from DamageDetection d join fetch d.image i
            where i.session.sessionId in :sessionIds
              and (d.isOverridden = false or d.isOverridden is null)
            """)
    List<DamageDetection> findActiveBySessionIds(@Param("sessionIds") Collection<UUID> sessionIds);
}
