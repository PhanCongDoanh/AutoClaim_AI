package com.autoclaim.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import javax.imageio.ImageIO;
import java.awt.AWTError;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Line2D;
import java.awt.geom.Path2D;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Draws the AI damage regions onto a check-out photo for the PDF report (Java2D, headless).
 * <p>
 * Shapes only — no text: the Alpine runtime may lack the native font stack, so {@code drawString} could fail or
 * render boxes. Damage numbers are drawn as seven-segment strokes inside a red circle; the Vietnamese labels live
 * in the PDF caption (embedded font). Any failure returns {@link Optional#empty()} so the caller can fall back to
 * the plain photo.
 */
@Slf4j
@Component
public class ReportImageAnnotator {

    /** Longest side of the annotated image; keeps the PDF small while staying sharp at half-page width. */
    private static final int MAX_SIDE = 1200;

    private static final Color STROKE = new Color(220, 38, 38);
    private static final Color FILL = new Color(220, 38, 38, 64);
    private static final Color MARKER_TEXT = Color.WHITE;

    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** A damage to draw: its number in the report table and the raw {@code bounding_box} JSON. */
    public record Mark(int number, String boundingBox) {
    }

    /**
     * @return the annotated photo as JPEG, or empty when the image cannot be read or drawn (use the plain photo).
     */
    public Optional<byte[]> annotate(byte[] imageBytes, List<Mark> marks) {
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (source == null) {
                return Optional.empty();
            }
            int sourceWidth = source.getWidth();
            int sourceHeight = source.getHeight();
            double scale = Math.min(1.0, (double) MAX_SIDE / Math.max(sourceWidth, sourceHeight));
            int width = Math.max(1, (int) Math.round(sourceWidth * scale));
            int height = Math.max(1, (int) Math.round(sourceHeight * scale));

            BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = canvas.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, width, height);
                g.drawImage(source, 0, 0, width, height, null);

                float lineWidth = Math.max(2f, Math.max(width, height) / 300f);
                for (Mark mark : marks) {
                    List<double[]> points = parsePolygon(mark.boundingBox(), sourceWidth, sourceHeight);
                    if (points.size() < 3) {
                        continue;
                    }
                    Path2D shape = toPath(points, width, height);
                    g.setColor(FILL);
                    g.fill(shape);
                    g.setColor(STROKE);
                    g.setStroke(new BasicStroke(lineWidth, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                    g.draw(shape);
                    drawNumberMarker(g, shape.getBounds2D(), mark.number(), Math.max(width, height), width, height);
                }
            } finally {
                g.dispose();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!ImageIO.write(canvas, "jpg", out)) {
                return Optional.empty();
            }
            return Optional.of(out.toByteArray());
        } catch (Exception | LinkageError | AWTError ex) {
            // e.g. unsupported image format or a missing native library in the container
            log.warn("Cannot annotate report image, using the plain photo: {}", ex.toString());
            return Optional.empty();
        }
    }

    // ------------------------------------------------------------------ bounding box

    /**
     * Polygon in normalised (0..1) coordinates. Falls back to the x/y/w/h rectangle when the polygon is missing;
     * pixel coordinates ({@code "normalized": false}) are normalised with the source size. Invalid JSON → empty.
     */
    static List<double[]> parsePolygon(String boundingBox, int sourceWidth, int sourceHeight) {
        List<double[]> points = new ArrayList<>();
        if (!StringUtils.hasText(boundingBox)) {
            return points;
        }
        JsonNode root;
        try {
            root = JSON.readTree(boundingBox);
        } catch (RuntimeException ex) {
            return points;
        }
        if (root == null || !root.isObject()) {
            return points;
        }
        boolean normalized = !root.has("normalized") || root.get("normalized").asBoolean(true);
        double sx = normalized ? 1.0 : 1.0 / sourceWidth;
        double sy = normalized ? 1.0 : 1.0 / sourceHeight;

        JsonNode polygon = root.get("polygon");
        if (polygon != null && polygon.isArray()) {
            for (JsonNode point : polygon) {
                if (point.isArray() && point.size() >= 2 && point.get(0).isNumber() && point.get(1).isNumber()) {
                    points.add(new double[]{clamp(point.get(0).asDouble() * sx), clamp(point.get(1).asDouble() * sy)});
                }
            }
        }
        if (points.size() >= 3) {
            return points;
        }

        points.clear();
        JsonNode x = root.get("x");
        JsonNode y = root.get("y");
        JsonNode w = root.get("w");
        JsonNode h = root.get("h");
        if (x == null || y == null || w == null || h == null
                || !x.isNumber() || !y.isNumber() || !w.isNumber() || !h.isNumber()) {
            return points;
        }
        double left = clamp(x.asDouble() * sx);
        double top = clamp(y.asDouble() * sy);
        double right = clamp((x.asDouble() + w.asDouble()) * sx);
        double bottom = clamp((y.asDouble() + h.asDouble()) * sy);
        if (right <= left || bottom <= top) {
            return points;
        }
        points.add(new double[]{left, top});
        points.add(new double[]{right, top});
        points.add(new double[]{right, bottom});
        points.add(new double[]{left, bottom});
        return points;
    }

    private static double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private static Path2D toPath(List<double[]> points, int width, int height) {
        Path2D.Double path = new Path2D.Double();
        path.moveTo(points.getFirst()[0] * width, points.getFirst()[1] * height);
        for (int i = 1; i < points.size(); i++) {
            path.lineTo(points.get(i)[0] * width, points.get(i)[1] * height);
        }
        path.closePath();
        return path;
    }

    // ------------------------------------------------------------------ number marker (no fonts)

    /** Segments a..g of a seven-segment digit: top, top-right, bottom-right, bottom, bottom-left, top-left, middle. */
    private static final String[] DIGIT_SEGMENTS = {
            "abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"
    };

    /** Red circle with the damage number at the top-left corner of the region, kept inside the image. */
    private static void drawNumberMarker(Graphics2D g, Rectangle2D region, int number, int longSide,
                                         int width, int height) {
        if (number < 0) {
            return;
        }
        String digits = String.valueOf(number);
        double radius = Math.max(12.0, longSide / 40.0) * (digits.length() > 1 ? 1.25 : 1.0);
        double cx = Math.max(radius, Math.min(width - radius, region.getMinX()));
        double cy = Math.max(radius, Math.min(height - radius, region.getMinY()));

        Ellipse2D circle = new Ellipse2D.Double(cx - radius, cy - radius, radius * 2, radius * 2);
        g.setColor(STROKE);
        g.fill(circle);
        g.setColor(MARKER_TEXT); // thin white ring so the marker stands out on red paint
        g.setStroke(new BasicStroke((float) Math.max(1.0, radius / 8)));
        g.draw(circle);

        double digitHeight = radius * 1.0;
        double digitWidth = digitHeight * 0.5;
        double gap = digitWidth * 0.5;
        double totalWidth = digits.length() * digitWidth + (digits.length() - 1) * gap;
        float stroke = (float) Math.max(1.5, digitHeight / 6.5);
        g.setColor(MARKER_TEXT);
        g.setStroke(new BasicStroke(stroke, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));

        double left = cx - totalWidth / 2;
        double top = cy - digitHeight / 2;
        for (int i = 0; i < digits.length(); i++) {
            drawDigit(g, digits.charAt(i) - '0', left + i * (digitWidth + gap), top, digitWidth, digitHeight);
        }
    }

    private static void drawDigit(Graphics2D g, int digit, double x, double y, double w, double h) {
        if (digit < 0 || digit > 9) {
            return;
        }
        double mid = y + h / 2;
        double bottom = y + h;
        double right = x + w;
        for (char segment : DIGIT_SEGMENTS[digit].toCharArray()) {
            Line2D line = switch (segment) {
                case 'a' -> new Line2D.Double(x, y, right, y);
                case 'b' -> new Line2D.Double(right, y, right, mid);
                case 'c' -> new Line2D.Double(right, mid, right, bottom);
                case 'd' -> new Line2D.Double(x, bottom, right, bottom);
                case 'e' -> new Line2D.Double(x, mid, x, bottom);
                case 'f' -> new Line2D.Double(x, y, x, mid);
                default -> new Line2D.Double(x, mid, right, mid);
            };
            g.draw(line);
        }
    }
}
