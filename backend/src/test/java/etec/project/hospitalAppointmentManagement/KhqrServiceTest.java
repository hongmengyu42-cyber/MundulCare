package etec.project.hospitalAppointmentManagement;

import etec.project.hospitalAppointmentManagement.Service.KhqrService;
import etec.project.hospitalAppointmentManagement.Service.impl.KhqrServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class KhqrServiceTest {

    private KhqrService khqrService;

    @BeforeEach
    void setUp() {
        khqrService = new KhqrServiceImpl();
    }

    @Test
    @DisplayName("Should generate valid EMVCo Bakong KHQR dynamic payload")
    void testGenerateDynamicKhqr() {
        String khqr = khqrService.generateDynamicKhqr(
                "mundulcare@aba",
                "MundulCare Hospital",
                "Phnom Penh",
                "ABA Bank",
                25.0,
                "USD",
                "INV-2026-001",
                "APT-100",
                "Consultation Fee"
        );

        assertNotNull(khqr);
        assertTrue(khqr.startsWith("000201010212"), "Must start with EMVCo format indicator and dynamic initiation (000201010212)");
        assertTrue(khqr.contains("bakong@nbc.gov.kh"), "Must contain global unique identifier for NBC Bakong");
        assertTrue(khqr.contains("mundulcare@aba"), "Must contain hospital merchant account ID");
        assertTrue(khqr.contains("5303840"), "Currency tag 53 must specify 840 (USD)");
        assertTrue(khqr.contains("540525.00"), "Amount tag 54 must format 25.00");
        assertTrue(khqr.contains("5802KH"), "Country code tag 58 must specify KH");
        assertTrue(khqr.contains("INV-2026-001"), "Sub-tag 01 must specify bill/invoice number");
        assertTrue(khqr.contains("6304"), "Must contain CRC-16 tag 63 with length 04");
    }

    @Test
    @DisplayName("Should calculate valid 4-character uppercase CRC-16 CCITT checksum")
    void testCrc16Checksum() {
        String crc = khqrService.calculateCrc16("000201010212");
        assertNotNull(crc);
        assertEquals(4, crc.length());
        assertTrue(crc.matches("^[0-9A-F]{4}$"), "CRC must be 4 uppercase hexadecimal characters");
    }

    @Test
    @DisplayName("Should compute 32-character lowercase hex MD5 hash required by NBC Bakong API")
    void testMd5Calculation() {
        String khqr = "00020101021229380017bakong@nbc.gov.kh0115mundulcare@aba6304A1B2";
        String md5 = khqrService.calculateMd5(khqr);

        assertNotNull(md5);
        assertEquals(32, md5.length());
        assertTrue(md5.matches("^[0-9a-f]{32}$"), "MD5 must be exactly 32 lowercase hex characters");
    }

    @Test
    @DisplayName("Should generate valid Base64 PNG QR code data URL")
    void testQrImageGeneration() {
        String content = "0002010102126304ABCD";
        String base64Image = khqrService.generateQrCodeBase64(content, 200, 200);

        assertNotNull(base64Image);
        assertTrue(base64Image.startsWith("data:image/png;base64,"), "QR code image must be encoded as a Base64 PNG Data URL");
        assertTrue(base64Image.length() > 100);
    }
}
