package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    /** One row per status that has at least one non-deleted vehicle: [VehicleStatus, Long count]. */
    @Query("select v.status, count(v) from Vehicle v where v.isDeleted = false group by v.status")
    List<Object[]> countByStatus();

    boolean existsByLicensePlateIgnoreCase(String licensePlate);

    boolean existsByLicensePlateIgnoreCaseAndVehicleIdNot(String licensePlate, UUID vehicleId);
}
