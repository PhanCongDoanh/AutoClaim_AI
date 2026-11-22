package com.autoclaim.api.controller;

import com.autoclaim.api.dto.request.CompleteMaintenanceRequest;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicles", description = "Vehicle listing and maintenance completion endpoints")
public class VehicleController {

    private final VehicleService vehicleService;

    @Operation(summary = "List vehicles by status", description = "Returns non-deleted vehicles filtered by status. Includes active booking, renter, and check-in session details when status is RENTED, and the last check-out session, maintenance start, renter, damage count/summary and notes when status is MAINTENANCE.")
    @GetMapping
    public ResponseEntity<List<VehicleResponseDto>> getVehicles(
            @RequestParam VehicleStatus status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(vehicleService.getVehicles(status, search));
    }

    @Operation(summary = "Count vehicles per status", description = "Returns {AVAILABLE, RENTED, MAINTENANCE} counts of non-deleted vehicles (0 when a status has none).")
    @GetMapping("/counts")
    public ResponseEntity<Map<VehicleStatus, Long>> getVehicleCounts() {
        return ResponseEntity.ok(vehicleService.countByStatus());
    }

    @Operation(summary = "Complete vehicle maintenance", description = "MAINTENANCE → AVAILABLE. maintenanceNotes (max 1000 chars, else 400) are stored on the latest COMPLETED booking; without one the vehicle is still released and notesSaved=false. 409 when the vehicle is not under maintenance.")
    @PatchMapping("/{id}/complete-maintenance")
    public ResponseEntity<VehicleResponseDto> completeMaintenance(
            @PathVariable UUID id,
            @RequestBody(required = false) CompleteMaintenanceRequest request) {
        return ResponseEntity.ok(vehicleService.completeMaintenance(id, request));
    }
}
