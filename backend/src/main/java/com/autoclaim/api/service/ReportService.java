package com.autoclaim.api.service;

import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionImage;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.AngleCode;
import com.autoclaim.api.entity.enums.SessionType;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.DamageDetectionRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Builds the damage / handover report PDF of an inspection session (read-only, never changes state).
 * Text uses the embedded Be Vietnam Pro font (SIL OFL, {@code resources/fonts/}) so Vietnamese diacritics render.
 * Layout follows {@code docs/ui-mockups/13_Bien-ban-PDF.png}: info, damage table, then the check-out photo of
 * every angle with a damage (red regions drawn by {@link ReportImageAnnotator}, two photos per row) and signatures.
 * A photo that cannot be downloaded or read is skipped; the PDF is always produced.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private static final String FONT_REGULAR = "fonts/BeVietnamPro-Regular.ttf";
    private static final String FONT_BOLD = "fonts/BeVietnamPro-Bold.ttf";

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Color TEXT = new Color(15, 23, 42);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color RULE = new Color(226, 232, 240);
    private static final Color HEADER_BG = new Color(241, 245, 249);
    private static final String EMPTY = "—";
    /** About half the A4 content width (499pt) per photo, two photos per row. */
    private static final float PHOTO_MAX_WIDTH = 236f;
    private static final float PHOTO_MAX_HEIGHT = 200f;

    private final InspectionSessionRepository inspectionSessionRepository;
    private final DamageDetectionRepository damageDetectionRepository;
    private final S3StorageService storageService;
    private final ReportImageAnnotator imageAnnotator;

    /** Loaded lazily once; BaseFont instances are thread-safe for reading. */
    private volatile Fonts fonts;

    public byte[] generateInspectionReport(UUID sessionId) {
        InspectionSession session = inspectionSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionSession", sessionId));

        Booking booking = session.getBooking();

        InspectionSession checkInSession = session.getSessionType() == SessionType.CHECK_IN
                ? session
                : inspectionSessionRepository.findFirstByBooking_BookingIdAndSessionTypeOrderByCreatedAtDesc(
                        booking.getBookingId(), SessionType.CHECK_IN).orElse(null);

        // Only damages the staff did not reject as AI mistakes, numbered like the results screen
        List<DamageDetection> validDamages = damageDetectionRepository
                .findByImage_Session_SessionId(sessionId)
                .stream()
                .filter(damage -> !Boolean.TRUE.equals(damage.getIsOverridden()))
                .sorted(InspectionLabels.DAMAGE_ORDER)
                .toList();

        return buildPdfDocument(session, checkInSession, validDamages);
    }

    private byte[] buildPdfDocument(
            InspectionSession session,
            InspectionSession checkInSession,
            List<DamageDetection> validDamages) {

        Fonts f = fonts();
        Booking booking = session.getBooking();
        Vehicle vehicle = booking.getVehicle();
        Renter renter = booking.getRenter();
        LocalDateTime checkOutAt = session.getSessionType() == SessionType.CHECK_OUT ? session.getCreatedAt() : null;

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 44, 44);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // 1. Brand line + report date
            PdfPTable top = new PdfPTable(new float[]{1f, 1f});
            top.setWidthPercentage(100);
            top.addCell(borderless(new Phrase("AutoClaim AI", f.brand), Element.ALIGN_LEFT));
            top.addCell(borderless(new Phrase("Ngày lập: " + LocalDateTime.now().format(DATE), f.small),
                    Element.ALIGN_RIGHT));
            document.add(top);

            LineSeparator rule = new LineSeparator(1.5f, 100f, TEXT, Element.ALIGN_CENTER, -4f);
            Paragraph ruleParagraph = new Paragraph();
            ruleParagraph.add(rule);
            ruleParagraph.setSpacingAfter(18f);
            document.add(ruleParagraph);

            // 2. Title
            Paragraph title = new Paragraph(validDamages.isEmpty()
                    ? "BIÊN BẢN BÀN GIAO XE – KHÔNG PHÁT HIỆN HƯ HẠI MỚI"
                    : "BIÊN BẢN GHI NHẬN HƯ HẠI", f.title);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph(vehicle.getModel() + " · " + vehicle.getLicensePlate(), f.muted);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(16f);
            document.add(subtitle);

            // 3. Rental information (two label/value pairs per row)
            PdfPTable info = new PdfPTable(new float[]{1.1f, 1.9f, 1.1f, 1.9f});
            info.setWidthPercentage(100);
            addInfoRow(info, f, "Phương tiện", vehicle.getModel(), "Biển số", vehicle.getLicensePlate());
            addInfoRow(info, f, "Người thuê", renter != null ? renter.getName() : null,
                    "Số điện thoại", renter != null ? renter.getPhoneNumber() : null);
            addInfoRow(info, f, "Check-in", formatDateTime(checkInSession != null ? checkInSession.getCreatedAt() : null),
                    "Check-out", formatDateTime(checkOutAt));
            info.setSpacingAfter(18f);
            document.add(info);

            // 4. Damages
            if (validDamages.isEmpty()) {
                Paragraph none = new Paragraph(
                        "Không phát hiện hư hại mới so với lúc check-in. Tình trạng ngoại thất khớp với lúc nhận xe.",
                        f.body);
                none.setSpacingAfter(24f);
                document.add(none);
            } else {
                document.add(buildDamageTable(f, validDamages));
                addDamagePhotos(document, f, validDamages);
            }

            // 5. Signatures
            document.add(buildSignatureTable(f, session.getStaff() != null ? session.getStaff().getName() : null));

            document.close();
        } catch (DocumentException ex) {
            log.error("Failed to generate PDF inspection report for session {}", session.getSessionId(), ex);
            throw new IllegalStateException("Failed to generate PDF inspection report", ex);
        }

        return out.toByteArray();
    }

    private PdfPTable buildDamageTable(Fonts f, List<DamageDetection> damages) {
        PdfPTable table = new PdfPTable(new float[]{0.5f, 2f, 3.3f, 1.2f});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        table.setSpacingAfter(28f);

        for (String header : List.of("#", "Loại hư hại", "Vị trí", "Độ tin cậy")) {
            PdfPCell cell = new PdfPCell(new Phrase(header, f.label));
            cell.setBackgroundColor(HEADER_BG);
            cell.setBorder(Rectangle.NO_BORDER);
            cell.setPadding(7f);
            table.addCell(cell);
        }

        for (int i = 0; i < damages.size(); i++) {
            DamageDetection d = damages.get(i);
            table.addCell(dataCell(String.valueOf(i + 1), f.body));
            table.addCell(dataCell(InspectionLabels.damageLabel(d.getDamageType()), f.body));
            table.addCell(dataCell(location(d), f.body));
            table.addCell(dataCell(formatConfidence(d.getConfidenceScore()), f.body));
        }
        return table;
    }

    /**
     * Check-out photo of each angle with a (non-overridden) damage, two per row, captioned with the angle and the
     * damage numbers of the table above ("#1 Trầy xước 89%"). Photos that fail to download/read are skipped.
     */
    private void addDamagePhotos(Document document, Fonts f, List<DamageDetection> damages) throws DocumentException {
        // Damages are already in report order (angle, then confidence) → number them like the table
        Map<UUID, List<Integer>> indexesByImage = new LinkedHashMap<>();
        for (int i = 0; i < damages.size(); i++) {
            InspectionImage image = damages.get(i).getImage();
            if (image != null) {
                indexesByImage.computeIfAbsent(image.getImageId(), key -> new ArrayList<>()).add(i);
            }
        }

        PdfPTable photos = new PdfPTable(2);
        photos.setWidthPercentage(100);
        photos.setSpacingAfter(24f);
        int added = 0;
        for (List<Integer> indexes : indexesByImage.values()) {
            InspectionImage image = damages.get(indexes.getFirst()).getImage();
            Image photo = loadPhoto(image, damages, indexes);
            if (photo == null) {
                continue;
            }
            photos.addCell(photoCell(f, image, photo, damages, indexes));
            added++;
        }
        if (added == 0) {
            return;
        }
        if (added % 2 == 1) {
            PdfPCell filler = new PdfPCell(new Phrase(""));
            filler.setBorder(Rectangle.NO_BORDER);
            photos.addCell(filler);
        }

        Paragraph heading = new Paragraph("Ảnh các góc có hư hại", f.label);
        heading.setSpacingAfter(8f);
        heading.setKeepTogether(true);
        document.add(heading);
        document.add(photos);
    }

    /** Downloads the check-out photo and draws its damage regions; plain photo if drawing fails, null if unusable. */
    private Image loadPhoto(InspectionImage image, List<DamageDetection> damages, List<Integer> indexes) {
        byte[] original = storageService.download(image.getImageUrl()).orElse(null);
        if (original == null) {
            log.warn("Report: skipping photo {} ({}), download failed", image.getImageId(), image.getAngleCode());
            return null;
        }
        List<ReportImageAnnotator.Mark> marks = indexes.stream()
                .map(i -> new ReportImageAnnotator.Mark(i + 1, damages.get(i).getBoundingBox()))
                .toList();
        byte[] bytes = imageAnnotator.annotate(original, marks).orElse(original);
        try {
            Image photo = Image.getInstance(bytes);
            photo.scaleToFit(PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT);
            photo.setAlignment(Element.ALIGN_CENTER);
            return photo;
        } catch (IOException | RuntimeException ex) {
            log.warn("Report: skipping photo {} ({}), unreadable: {}", image.getImageId(), image.getAngleCode(),
                    ex.toString());
            return null;
        }
    }

    private static PdfPCell photoCell(Fonts f, InspectionImage image, Image photo,
                                      List<DamageDetection> damages, List<Integer> indexes) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4f);
        cell.setPaddingBottom(12f);
        cell.addElement(photo);

        AngleCode angle = image.getAngleCode();
        Integer number = InspectionLabels.angleNumber(angle);
        Paragraph angleCaption = new Paragraph(
                (number != null ? "Góc " + number + " · " : "") + InspectionLabels.angleLabel(angle), f.label);
        angleCaption.setAlignment(Element.ALIGN_CENTER);
        angleCaption.setSpacingBefore(4f);
        cell.addElement(angleCaption);

        List<String> labels = new ArrayList<>();
        for (int i : indexes) {
            DamageDetection d = damages.get(i);
            labels.add("#" + (i + 1) + " " + InspectionLabels.damageLabel(d.getDamageType()) + " "
                    + formatConfidence(d.getConfidenceScore()));
        }
        Paragraph damageCaption = new Paragraph(String.join("  ·  ", labels), f.small);
        damageCaption.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(damageCaption);
        return cell;
    }

    private PdfPTable buildSignatureTable(Fonts f, String staffName) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setKeepTogether(true);

        table.addCell(borderless(new Phrase("Nhân viên kiểm định", f.label), Element.ALIGN_CENTER));
        table.addCell(borderless(new Phrase("Người thuê", f.label), Element.ALIGN_CENTER));

        PdfPCell space = borderless(new Phrase(" ", f.body), Element.ALIGN_CENTER);
        space.setFixedHeight(56f);
        table.addCell(space);
        table.addCell(space);

        table.addCell(borderless(new Phrase(StringUtils.hasText(staffName) ? staffName : "(Ký, ghi rõ họ tên)", f.signature),
                Element.ALIGN_CENTER));
        table.addCell(borderless(new Phrase("(Ký, ghi rõ họ tên)", f.signature), Element.ALIGN_CENTER));
        return table;
    }

    private static void addInfoRow(PdfPTable table, Fonts f, String label1, String value1, String label2, String value2) {
        table.addCell(infoCell(label1, f.muted, Element.ALIGN_LEFT));
        table.addCell(infoCell(StringUtils.hasText(value1) ? value1 : EMPTY, f.label, Element.ALIGN_RIGHT));
        table.addCell(infoCell(label2, f.muted, Element.ALIGN_LEFT));
        table.addCell(infoCell(StringUtils.hasText(value2) ? value2 : EMPTY, f.label, Element.ALIGN_RIGHT));
    }

    /** "Cửa trước trái · Góc 2 – Góc trước trái"; without a part name only the angle is shown. */
    private static String location(DamageDetection d) {
        AngleCode angle = d.getImage() != null ? d.getImage().getAngleCode() : null;
        Integer number = InspectionLabels.angleNumber(angle);
        String angleText = angle == null ? ""
                : (number != null ? "Góc " + number + " – " : "") + InspectionLabels.angleLabel(angle);
        if (StringUtils.hasText(d.getPartName())) {
            return angleText.isEmpty() ? d.getPartName() : d.getPartName() + " · " + angleText;
        }
        return angleText.isEmpty() ? EMPTY : angleText;
    }

    private static String formatConfidence(Double score) {
        if (score == null) {
            return EMPTY;
        }
        double pct = score <= 1.0 ? score * 100.0 : score;
        return "%.0f%%".formatted(pct);
    }

    private static String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME) : EMPTY;
    }

    private static PdfPCell borderless(Phrase phrase, int alignment) {
        PdfPCell cell = new PdfPCell(phrase);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(2f);
        return cell;
    }

    private static PdfPCell infoCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE);
        cell.setHorizontalAlignment(alignment);
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(7f);
        cell.setPaddingLeft(2f);
        cell.setPaddingRight(8f);
        return cell;
    }

    private static PdfPCell dataCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE);
        cell.setPadding(7f);
        return cell;
    }

    // ------------------------------------------------------------------ fonts

    private record Fonts(Font brand, Font title, Font label, Font body, Font muted, Font small, Font signature) {
    }

    private Fonts fonts() {
        Fonts loaded = fonts;
        if (loaded == null) {
            synchronized (this) {
                loaded = fonts;
                if (loaded == null) {
                    BaseFont regular = loadFont(FONT_REGULAR);
                    BaseFont bold = loadFont(FONT_BOLD);
                    loaded = new Fonts(
                            new Font(bold, 14, Font.NORMAL, TEXT),
                            new Font(bold, 15, Font.NORMAL, TEXT),
                            new Font(bold, 10, Font.NORMAL, TEXT),
                            new Font(regular, 10, Font.NORMAL, TEXT),
                            new Font(regular, 10, Font.NORMAL, MUTED),
                            new Font(regular, 9, Font.NORMAL, MUTED),
                            new Font(regular, 10, Font.ITALIC, MUTED));
                    fonts = loaded;
                }
            }
        }
        return loaded;
    }

    /** Embeds a TTF from the classpath with Identity-H encoding (full Unicode, incl. Vietnamese). */
    private static BaseFont loadFont(String classpathLocation) {
        try (InputStream in = new ClassPathResource(classpathLocation).getInputStream()) {
            byte[] bytes = in.readAllBytes();
            return BaseFont.createFont(classpathLocation, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, bytes, null);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot load PDF font " + classpathLocation, ex);
        } catch (DocumentException ex) {
            throw new IllegalStateException("Invalid PDF font " + classpathLocation, ex);
        }
    }
}
