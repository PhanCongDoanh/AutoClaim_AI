package com.autoclaim.api.repository;

import com.autoclaim.api.entity.Renter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RenterRepository extends JpaRepository<Renter, UUID> {
}
