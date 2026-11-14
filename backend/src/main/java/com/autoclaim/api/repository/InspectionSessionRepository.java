package com.autoclaim.api.repository;

import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.enums.SessionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InspectionSessionRepository extends JpaRepository<InspectionSession, UUID> {

    Optional<InspectionSession> findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
            UUID bookingId, SessionType sessionType);

    @Modifying
    @Query("update InspectionSession s set s.aiStatus = :aiStatus where s.sessionId = :sessionId")
    int updateAiStatus(@Param("sessionId") UUID sessionId, @Param("aiStatus") String aiStatus);
}
