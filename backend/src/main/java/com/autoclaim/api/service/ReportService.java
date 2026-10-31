package com.autoclaim.api.service;

import com.autoclaim.api.entity.Booking;
import com.autoclaim.api.entity.DamageDetection;
import com.autoclaim.api.entity.InspectionSession;
import com.autoclaim.api.entity.Renter;
import com.autoclaim.api.entity.Vehicle;
import com.autoclaim.api.entity.enums.BookingStatus;
import com.autoclaim.api.entity.enums.VehicleStatus;
import com.autoclaim.api.exception.ResourceNotFoundException;
import com.autoclaim.api.repository.BookingRepository;
import com.autoclaim.api.repository.DamageDetectionRepository;
import com.autoclaim.api.repository.InspectionSessionRepository;
import com.autoclaim.api.repository.VehicleRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final InspectionSessionRepository inspectionSessionRepository;
    private final DamageDetectionRepository damageDetectionRepository;
    private final VehicleRepository vehicleRepository;
    private final BookingRepository bookingRepository;

    @Transactional(rollbackFor = Exception.class)
    public byte[] generateInspectionReport(UUID sessionId) {
        InspectionSession session = inspectionSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionSession", sessionId));

        Booking booking = session.getBooking();
        Renter renter = booking.getRenter();
        Vehicle vehicle = booking.getVehicle();

        // Filter out any damage where isOverridden == true
        List<DamageDetection> validDamages = damageDetectionRepository
                .findByImage_Session_SessionId(sessionId)
                .stream()
                .filter(damage -> !Boolean.TRUE.equals(damage.getIsOverridden()))
                .toList();

        // Business Rule: If valid damages exist -> MAINTENANCE, otherwise -> AVAILABLE
        VehicleStatus newVehicleStatus = validDamages.isEmpty()
                ? VehicleStatus.AVAILABLE
                : VehicleStatus.MAINTENANCE;
        vehicle.setStatus(newVehicleStatus);
        vehicleRepository.saveAndFlush(vehicle);

        booking.setStatus(BookingStatus.COMPLETED);
        bookingRepository.saveAndFlush(booking);

        return buildPdfDocument(session, renter, vehicle, validDamages, newVehicleStatus);
    }

    private byte[] buildPdfDocument(
            InspectionSession session,
            Renter renter,
            Vehicle vehicle,
            List<DamageDetection> validDamages,
            VehicleStatus finalVehicleStatus) {

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.DARK_GRAY);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.BLACK);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);

            // 1. Title
            Paragraph title = new Paragraph("AUTOCLAIM - VEHICLE INSPECTION REPORT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20f);
            document.add(title);

            // 2. Renter & Vehicle Info
            Paragraph infoHeader = new Paragraph("1. Rental & Vehicle Information", sectionFont);
            infoHeader.setSpacingAfter(10f);
            document.add(infoHeader);

            document.add(createInfoLine("Session ID: ", session.getSessionId().toString(), labelFont, bodyFont));
            document.add(createInfoLine("Session Type: ", session.getSessionType().name(), labelFont, bodyFont));
            document.add(createInfoLine("Report Date: ", LocalDateTime.now().format(DATE_FORMATTER), labelFont, bodyFont));
            document.add(createInfoLine("Renter Name: ", renter.getName(), labelFont, bodyFont));
            document.add(createInfoLine("Renter Phone: ",
                    renter.getPhoneNumber() != null ? renter.getPhoneNumber() : "N/A", labelFont, bodyFont));
            document.add(createInfoLine("Vehicle License Plate: ", vehicle.getLicensePlate(), labelFont, bodyFont));
            document.add(createInfoLine("Vehicle Model: ", vehicle.getModel(), labelFont, bodyFont));
            document.add(createInfoLine("Updated Vehicle Status: ", finalVehicleStatus.name(), labelFont, bodyFont));

            Paragraph spacer = new Paragraph(" ");
            spacer.setSpacingAfter(10f);
            document.add(spacer);

            // 3. Identified Damages List
            Paragraph damageHeader = new Paragraph(
                    "2. Identified Damages (" + validDamages.size() + ")", sectionFont);
            damageHeader.setSpacingAfter(10f);
            document.add(damageHeader);

            if (validDamages.isEmpty()) {
                Paragraph noDamages = new Paragraph(
                        "No valid exterior damages detected. Vehicle status returned to AVAILABLE.", bodyFont);
                document.add(noDamages);
            } else {
                PdfPTable table = new PdfPTable(new float[]{1.2f, 2.2f, 3.0f, 2.0f, 3.6f});
                table.setWidthPercentage(100);
                table.setSpacingBefore(5f);

                addTableHeader(table, "#", labelFont);
                addTableHeader(table, "Angle", labelFont);
                addTableHeader(table, "Damage Type", labelFont);
                addTableHeader(table, "Confidence", labelFont);
                addTableHeader(table, "Bounding Box", labelFont);

                for (int i = 0; i < validDamages.size(); i++) {
                    DamageDetection d = validDamages.get(i);
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(i + 1), bodyFont)));
                    table.addCell(new PdfPCell(new Phrase(
                            d.getImage() != null && d.getImage().getAngleCode() != null
                                    ? d.getImage().getAngleCode().name()
                                    : "N/A",
                            bodyFont)));
                    table.addCell(new PdfPCell(new Phrase(d.getDamageType(), bodyFont)));
                    double scorePct = d.getConfidenceScore() != null
                            ? (d.getConfidenceScore() <= 1.0 ? d.getConfidenceScore() * 100.0 : d.getConfidenceScore())
                            : 0.0;
                    table.addCell(new PdfPCell(new Phrase(String.format("%.1f%%", scorePct), bodyFont)));
                    table.addCell(new PdfPCell(new Phrase(
                            d.getBoundingBox() != null ? d.getBoundingBox() : "{}", bodyFont)));
                }

                document.add(table);
            }

            document.close();
        } catch (DocumentException ex) {
            log.error("Failed to generate PDF inspection report for session {}", session.getSessionId(), ex);
            throw new IllegalStateException("Failed to generate PDF inspection report", ex);
        }

        return out.toByteArray();
    }

    private Paragraph createInfoLine(String label, String value, Font labelFont, Font bodyFont) {
        Paragraph p = new Paragraph();
        p.add(new Phrase(label, labelFont));
        p.add(new Phrase(value != null ? value : "N/A", bodyFont));
        p.setSpacingAfter(4f);
        return p;
    }

    private void addTableHeader(PdfPTable table, String headerTitle, Font font) {
        PdfPCell header = new PdfPCell(new Phrase(headerTitle, font));
        header.setBackgroundColor(new Color(230, 230, 230));
        header.setPadding(6f);
        table.addCell(header);
    }
}
