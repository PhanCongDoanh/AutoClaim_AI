package com.autoclaim.api.service;

import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.enums.AngleCode;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.Map;

/**
 * Vietnamese display labels and a stable damage order shared by the results API and the PDF report.
 *
 * <p>Angle names must match {@code frontend/src/components/inspection/photoAngles.ts} (ANGLE_LABELS) and
 * damage labels must match the AI contract in CLAUDE.md — keep them in sync.
 */
public final class InspectionLabels {

    private static final Map<AngleCode, String> ANGLE_LABELS = new EnumMap<>(Map.of(
            AngleCode.ANGLE_1, "Đầu xe",
            AngleCode.ANGLE_2, "Góc trước trái",
            AngleCode.ANGLE_3, "Hông trái",
            AngleCode.ANGLE_4, "Góc sau trái",
            AngleCode.ANGLE_5, "Đuôi xe",
            AngleCode.ANGLE_6, "Góc sau phải",
            AngleCode.ANGLE_7, "Hông phải",
            AngleCode.ANGLE_8, "Góc trước phải",
            AngleCode.CCCD_FRONT, "CCCD mặt trước",
            AngleCode.CCCD_BACK, "CCCD mặt sau"
    ));

    private static final Map<String, String> DAMAGE_LABELS = Map.of(
            "scratch", "Trầy xước",
            "dent", "Móp méo",
            "crack", "Nứt",
            "glass_shatter", "Vỡ kính",
            "lamp_broken", "Vỡ đèn",
            "tire_flat", "Xẹp lốp"
    );

    /**
     * Order used to number damages (#1, #2, …) consistently on screen and in the PDF:
     * by angle (ANGLE_1 → ANGLE_8), then highest confidence first.
     */
    public static final Comparator<DamageDetection> DAMAGE_ORDER = Comparator
            .comparing((DamageDetection d) -> d.getImage() != null ? d.getImage().getAngleCode() : null,
                    Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(DamageDetection::getConfidenceScore,
                    Comparator.nullsLast(Comparator.reverseOrder()));

    private InspectionLabels() {
    }

    /** "Góc 2 · Góc trước trái" style label, e.g. {@code angleLabel(ANGLE_2)} → "Góc trước trái". */
    public static String angleLabel(AngleCode angleCode) {
        return angleCode == null ? "" : ANGLE_LABELS.getOrDefault(angleCode, angleCode.name());
    }

    /** 1-based angle number for ANGLE_1..ANGLE_8, or null for other codes. */
    public static Integer angleNumber(AngleCode angleCode) {
        if (angleCode == null || !angleCode.name().startsWith("ANGLE_")) {
            return null;
        }
        return Integer.parseInt(angleCode.name().substring("ANGLE_".length()));
    }

    /** Vietnamese label for an AI damage class; unknown classes are returned unchanged. */
    public static String damageLabel(String damageType) {
        if (damageType == null) {
            return "";
        }
        return DAMAGE_LABELS.getOrDefault(damageType, damageType);
    }
}
