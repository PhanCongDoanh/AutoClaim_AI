package com.autoclaim.api.repository;

import com.autoclaim.api.entity.VehicleReferenceImage;
import com.autoclaim.api.entity.enums.AngleCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleReferenceImageRepository extends JpaRepository<VehicleReferenceImage, UUID> {

    List<VehicleReferenceImage> findByVehicle_VehicleId(UUID vehicleId);

    Optional<VehicleReferenceImage> findByVehicle_VehicleIdAndAngleCode(UUID vehicleId, AngleCode angleCode);
}
