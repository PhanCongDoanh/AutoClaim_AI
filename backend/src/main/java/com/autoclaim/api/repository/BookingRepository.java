package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findFirstByVehicle_VehicleIdAndStatusOrderByCreatedAtDesc(UUID vehicleId, BookingStatus status);

    Optional<Booking> findFirstByVehicle_VehicleIdOrderByCreatedAtDesc(UUID vehicleId);
}
