package etec.project.hospitalAppointmentManagement.Service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import etec.project.hospitalAppointmentManagement.Service.KhqrService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

@Service
@Slf4j
public class KhqrServiceImpl implements KhqrService {

    @Override
    public String generateDynamicKhqr(
            String bakongAccountId,
            String merchantName,
            String merchantCity,
            String acquiringBank,
            Double amount,
            String currency,
            String billNumber,
            String referenceNumber,
            String purpose
    ) {
        StringBuilder sb = new StringBuilder();

        // 00: Payload Format Indicator (01)
        appendTlv(sb, "00", "01");

        // 01: Point of Initiation Method (12 = Dynamic QR)
        appendTlv(sb, "01", "12");

        // 29: Merchant Account Information (Bakong Template)
        StringBuilder subTag29 = new StringBuilder();
        appendTlv(subTag29, "00", "bakong@nbc.gov.kh"); // Global Unique Identifier
        if (bakongAccountId != null && !bakongAccountId.isBlank()) {
            appendTlv(subTag29, "01", bakongAccountId.trim());
        }
        if (acquiringBank != null && !acquiringBank.isBlank()) {
            appendTlv(subTag29, "02", acquiringBank.trim());
        }
        appendTlv(sb, "29", subTag29.toString());

        // 52: Merchant Category Code (8099 = Medical Services & Health Practitioners)
        appendTlv(sb, "52", "8099");

        // 53: Transaction Currency (840 = USD, 116 = KHR)
        String currencyCode = "KHR".equalsIgnoreCase(currency) ? "116" : "840";
        appendTlv(sb, "53", currencyCode);

        // 54: Transaction Amount (Always use Locale.US for strict EMVCo dot decimal separator)
        String formattedAmount;
        if ("116".equals(currencyCode)) {
            formattedAmount = String.format(java.util.Locale.US, "%.0f", amount != null ? amount : 0.0);
        } else {
            formattedAmount = String.format(java.util.Locale.US, "%.2f", amount != null ? amount : 0.0);
        }
        appendTlv(sb, "54", formattedAmount);

        // 58: Country Code (KH)
        appendTlv(sb, "58", "KH");

        // 59: Merchant Name
        String name = (merchantName != null && !merchantName.isBlank()) ? merchantName : "MundulCare Hospital";
        appendTlv(sb, "59", name);

        // 60: Merchant City
        String city = (merchantCity != null && !merchantCity.isBlank()) ? merchantCity : "Phnom Penh";
        appendTlv(sb, "60", city);

        // 62: Additional Data Field Template
        StringBuilder subTag62 = new StringBuilder();
        if (billNumber != null && !billNumber.isBlank()) {
            appendTlv(subTag62, "01", billNumber.trim()); // Bill Number
        }
        if (referenceNumber != null && !referenceNumber.isBlank()) {
            appendTlv(subTag62, "05", referenceNumber.trim()); // Reference Label
        }
        if (purpose != null && !purpose.isBlank()) {
            appendTlv(subTag62, "08", purpose.trim()); // Purpose of Transaction
        }
        if (!subTag62.isEmpty()) {
            appendTlv(sb, "62", subTag62.toString());
        }

        // 63: CRC-16 Checksum
        // Append Tag 63 and Length 04, then calculate CRC over everything up to this point
        sb.append("6304");
        String crc = calculateCrc16(sb.toString());
        sb.append(crc);

        return sb.toString();
    }

    private void appendTlv(StringBuilder sb, String tag, String value) {
        if (value == null) return;
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        int length = bytes.length;
        sb.append(tag);
        sb.append(String.format("%02d", length));
        sb.append(value);
    }

    @Override
    public String calculateCrc16(String data) {
        int crc = 0xFFFF;
        int polynomial = 0x1021;
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);

        for (byte b : bytes) {
            for (int i = 0; i < 8; i++) {
                boolean bit = ((b >> (7 - i) & 1) == 1);
                boolean c15 = ((crc >> 15 & 1) == 1);
                crc <<= 1;
                if (c15 ^ bit) {
                    crc ^= polynomial;
                }
            }
        }
        crc &= 0xFFFF;
        return String.format("%04X", crc);
    }

    @Override
    public String calculateMd5(String khqrString) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(khqrString.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().toLowerCase();
        } catch (NoSuchAlgorithmException e) {
            log.error("MD5 algorithm not available", e);
            throw new RuntimeException("MD5 digest algorithm unavailable", e);
        }
    }

    @Override
    public String generateQrCodeBase64(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, hints);
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngData);
        } catch (Exception e) {
            log.error("Failed to generate QR code image", e);
            throw new RuntimeException("Error rendering QR code image", e);
        }
    }
}
