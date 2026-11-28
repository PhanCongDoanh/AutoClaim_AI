package com.autoclaim.api.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotValidationResponseDto {
    private boolean valid;

    @JsonProperty("expected_angle")
    private String expectedAngle;

    @JsonProperty("detected_angle")
    private String detectedAngle;

    @JsonProperty("viewpoint_verified")
    private boolean viewpointVerified;

    @JsonProperty("viewpoint_score")
    private Double viewpointScore;

    @JsonProperty("viewpoint_score_type")
    private String viewpointScoreType;

    @JsonProperty("quality_passed")
    private boolean qualityPassed;

    @JsonProperty("quality_details")
    private Map<String, Object> qualityDetails;

    private boolean aligned;

    @JsonProperty("alignment_reliable")
    private boolean alignmentReliable;

    private Integer inliers;

    @JsonProperty("deviation_percent")
    private Double deviationPercent;

    @JsonProperty("comparable_coverage_percent")
    private Double comparableCoveragePercent;

    @JsonProperty("max_deviation_percent")
    private Double maxDeviationPercent;

    @JsonProperty("error_code")
    private String errorCode;

    private String message;

    @JsonProperty("image_hash")
    private String imageHash;
}
