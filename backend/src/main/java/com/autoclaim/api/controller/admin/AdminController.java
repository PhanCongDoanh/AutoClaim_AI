package com.autoclaim.api.controller.admin;

import com.autoclaim.api.dto.request.CreateStaffRequest;
import com.autoclaim.api.dto.request.CreateVehicleRequest;
import com.autoclaim.api.dto.response.StaffResponseDto;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.service.admin.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin endpoints for managing staff and vehicles")
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "List all active staff", description = "Returns all users where isDeleted = false.")
    @GetMapping("/staff")
    public ResponseEntity<List<StaffResponseDto>> getStaff() {
        return ResponseEntity.ok(adminService.getAllStaff());
    }

    @Operation(summary = "List all active vehicles", description = "Returns all vehicles where isDeleted = false.")
    @GetMapping("/vehicles")
    public ResponseEntity<List<VehicleResponseDto>> getVehicles() {
        return ResponseEntity.ok(adminService.getAllVehicles());
    }

    @Operation(summary = "Create a new vehicle", description = "Creates an AVAILABLE vehicle with model, licensePlate, and seats (defaults to 5).")
    @PostMapping("/vehicles")
    public ResponseEntity<VehicleResponseDto> createVehicle(@Valid @RequestBody CreateVehicleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createVehicle(request));
    }

    @Operation(summary = "Create a new staff user", description = "Creates a staff/admin user with auto-generated BCrypt password.")
    @PostMapping("/staff")
    public ResponseEntity<StaffResponseDto> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createStaff(request));
    }

    @Operation(summary = "Soft-delete a vehicle", description = "Sets isDeleted = true on the vehicle. Fails if the vehicle is currently RENTED.")
    @DeleteMapping("/vehicles/{id}")
    public ResponseEntity<Map<String, Object>> deleteVehicle(@PathVariable UUID id) {
        adminService.deleteVehicle(id);
        return ResponseEntity.ok(Map.of(
                "vehicleId", id,
                "isDeleted", true,
                "message", "Vehicle deleted successfully"
        ));
    }

    @Operation(summary = "Soft-delete a staff user", description = "Sets isDeleted = true on the user.")
    @DeleteMapping("/staff/{id}")
    public ResponseEntity<Map<String, Object>> deleteStaff(@PathVariable UUID id) {
        adminService.deleteStaff(id);
        return ResponseEntity.ok(Map.of(
                "userId", id,
                "isDeleted", true,
                "message", "Staff member deleted successfully"
        ));
    }
}
