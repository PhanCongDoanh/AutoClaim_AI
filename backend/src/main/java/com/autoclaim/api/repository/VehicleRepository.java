package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    List<Vehicle> findByStatusAndModelContainingIgnoreCaseAndIsDeletedFalse(VehicleStatus status, String model);

    List<Vehicle> findByStatusAndIsDeletedFalse(VehicleStatus status);

    List<Vehicle> findByIsDeletedFalse();

    List<Vehicle> findByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<Vehicle> findByVehicleIdAndIsDeletedFalse(UUID vehicleId);

    boolean existsByLicensePlateIgnoreCase(String licensePlate);
}
