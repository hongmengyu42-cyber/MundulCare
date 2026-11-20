package etec.project.hospitalAppointmentManagement.Service;

public interface KhqrService {

    /**
     * Generates a genuine EMVCo-compliant Bakong KHQR dynamic payment payload string.
     */
    String generateDynamicKhqr(
            String bakongAccountId,
            String merchantName,
            String merchantCity,
            String acquiringBank,
            Double amount,
            String currency,
            String billNumber,
            String referenceNumber,
            String purpose
    );

    /**
     * Calculates the CRC-16 CCITT (poly 0x1021, init 0xFFFF) checksum for an EMVCo payload.
     */
    String calculateCrc16(String data);

    /**
     * Calculates the MD5 hash (32 lowercase hex characters) used by the NBC Bakong Open API.
     */
    String calculateMd5(String khqrString);

    /**
     * Renders a QR code image as a Base64-encoded Data URL (data:image/png;base64,...).
     */
    String generateQrCodeBase64(String content, int width, int height);
}
