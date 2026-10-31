package com.autoclaim.api.repository;

import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.enums.SessionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InspectionSessionRepository extends JpaRepository<InspectionSession, UUID> {

    Optional<InspectionSession> findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
            UUID bookingId, SessionType sessionType);
}
