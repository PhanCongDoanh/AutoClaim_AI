package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findFirstByVehicle_VehicleIdAndStatusOrderByCreatedAtDesc(UUID vehicleId, BookingStatus status);

    Optional<Booking> findFirstByVehicle_VehicleIdOrderByCreatedAtDesc(UUID vehicleId);

    /**
     * Latest booking with the given status of each listed vehicle (renter fetched), in one query. A vehicle with
     * two such bookings created at the exact same instant may appear twice; callers keep the first.
     */
    @Query("""
            select b from Booking b join fetch b.renter
            where b.vehicle.vehicleId in :vehicleIds and b.status = :status
              and b.createdAt = (select max(b2.createdAt) from Booking b2
                                 where b2.vehicle = b.vehicle and b2.status = :status)
            """)
    List<Booking> findLatestByVehicleIdsAndStatus(@Param("vehicleIds") Collection<UUID> vehicleIds,
                                                  @Param("status") BookingStatus status);

    /**
     * Loads a booking with a row lock (SELECT ... FOR UPDATE) so concurrent check-out / complete requests
     * for the same booking are serialized. Must be called inside a transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.bookingId = :bookingId")
    Optional<Booking> findByIdForUpdate(@Param("bookingId") UUID bookingId);
}
