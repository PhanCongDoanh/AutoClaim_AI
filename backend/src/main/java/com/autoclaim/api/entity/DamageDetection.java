package com.autoclaim.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "damage_detections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "image")
public class DamageDetection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "detection_id", nullable = false, updatable = false)
    private UUID detectionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false)
    private InspectionImage image;

    @Column(name = "damage_type", nullable = false, length = 100)
    private String damageType;

    @Column(name = "part_name", length = 100)
    private String partName;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore;

    /** Raw JSON, e.g. {"x": 10, "y": 20, "w": 100, "h": 50}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bounding_box", columnDefinition = "jsonb")
    private String boundingBox;

    @Builder.Default
    @Column(name = "is_overridden")
    private Boolean isOverridden = false;

    @Column(name = "override_reason", length = 255)
    private String overrideReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
