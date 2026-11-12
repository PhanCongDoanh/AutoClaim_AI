package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findFirstByVehicle_VehicleIdAndStatusOrderByCreatedAtDesc(UUID vehicleId, BookingStatus status);

    Optional<Booking> findFirstByVehicle_VehicleIdOrderByCreatedAtDesc(UUID vehicleId);

    /**
     * Loads a booking with a row lock (SELECT ... FOR UPDATE) so concurrent check-out / complete requests
     * for the same booking are serialized. Must be called inside a transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.bookingId = :bookingId")
    Optional<Booking> findByIdForUpdate(@Param("bookingId") UUID bookingId);
}
