package com.autoclaim.api.controller.admin;

import com.autoclaim.api.dto.request.CreateStaffRequest;
import com.autoclaim.api.dto.request.UpdateStaffRequest;
import com.autoclaim.api.dto.response.StaffResponseDto;
import com.autoclaim.api.dto.response.VehicleResponseDto;
import com.autoclaim.api.service.admin.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @Operation(
            summary = "Create a new vehicle",
            description = "Creates an AVAILABLE vehicle using multipart/form-data with model, licensePlate, seats (defaults to 5), and optional avatar image."
    )
    @PostMapping(value = "/vehicles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VehicleResponseDto> createVehicle(
            @Parameter(description = "Vehicle model name", required = true, example = "Toyota Vios 2024")
            @RequestParam String model,

            @Parameter(description = "Unique license plate", required = true, example = "43A-888.99")
            @RequestParam String licensePlate,

            @Parameter(description = "Number of seats (defaults to 5)", example = "5")
            @RequestParam(defaultValue = "5") Integer seats,

            @Parameter(
                    description = "Optional vehicle avatar image",
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(type = "string", format = "binary")
                    )
            )
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createVehicle(model, licensePlate, seats, avatar));
    }

    @Operation(
            summary = "Update an existing vehicle",
            description = "Updates vehicle info (model, licensePlate, seats) and replaces its avatar if a new file is uploaded."
    )
    @PutMapping(value = "/vehicles/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VehicleResponseDto> updateVehicle(
            @PathVariable UUID id,

            @Parameter(description = "Vehicle model name", required = true, example = "Toyota Vios 2024")
            @RequestParam String model,

            @Parameter(description = "Unique license plate", required = true, example = "43A-888.99")
            @RequestParam String licensePlate,

            @Parameter(description = "Number of seats (defaults to 5)", example = "5")
            @RequestParam(defaultValue = "5") Integer seats,

            @Parameter(
                    description = "Optional new vehicle avatar image",
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(type = "string", format = "binary")
                    )
            )
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        return ResponseEntity.ok(adminService.updateVehicle(id, model, licensePlate, seats, avatar));
    }

    @Operation(summary = "Create a new staff user", description = "Creates a staff/admin user from fullName, email, phone, password (stored BCrypt-hashed) and roleName.")
    @PostMapping("/staff")
    public ResponseEntity<StaffResponseDto> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createStaff(request));
    }

    @Operation(summary = "Update an existing staff user", description = "Updates a staff/admin user's fullName, phone, and roleName. Email and password cannot be changed here.")
    @PutMapping("/staff/{id}")
    public ResponseEntity<StaffResponseDto> updateStaff(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStaffRequest request) {
        return ResponseEntity.ok(adminService.updateStaff(id, request));
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
