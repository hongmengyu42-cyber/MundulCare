package etec.project.hospitalAppointmentManagement;

import etec.project.hospitalAppointmentManagement.Service.impl.AiSymptomServiceImpl;
import etec.project.hospitalAppointmentManagement.dto.request.SymptomMatchRequest;
import etec.project.hospitalAppointmentManagement.dto.response.SymptomMatchResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class AiSymptomServiceTest {

    @Test
    void testNonMedicalGreetingDoesNotRecommendDoctors() {
        AiSymptomServiceImpl service = new AiSymptomServiceImpl(null, null, null, null, null);
        SymptomMatchRequest request = SymptomMatchRequest.builder()
                .symptoms("hello")
                .build();

        SymptomMatchResponse response = service.matchSymptoms(request);

        assertNotNull(response);
        assertFalse(response.isMedicalRelated(), "Greeting should not be marked as medicalRelated");
        assertNull(response.getDetectedSpecialty(), "Detected specialty should be null for non-medical queries");
        assertTrue(response.getMatchingDoctors().isEmpty(), "No doctors should be recommended for non-medical inquiries");
        assertTrue(response.getClinicalExplanation().contains("Clinical Triaging Assistant"));
    }

    @Test
    void testNonMedicalChitChatDoesNotRecommendDoctors() {
        AiSymptomServiceImpl service = new AiSymptomServiceImpl(null, null, null, null, null);
        SymptomMatchRequest request = SymptomMatchRequest.builder()
                .symptoms("how are you doing today?")
                .build();

        SymptomMatchResponse response = service.matchSymptoms(request);

        assertNotNull(response);
        assertFalse(response.isMedicalRelated());
        assertNull(response.getDetectedSpecialty());
        assertTrue(response.getMatchingDoctors().isEmpty(), "No doctors should be recommended");
    }

    @Test
    void testShortOrEmptyInputDoesNotRecommendDoctors() {
        AiSymptomServiceImpl service = new AiSymptomServiceImpl(null, null, null, null, null);
        SymptomMatchResponse response = service.matchSymptoms(SymptomMatchRequest.builder().symptoms("hi").build());

        assertNotNull(response);
        assertFalse(response.isMedicalRelated());
        assertNull(response.getDetectedSpecialty());
        assertTrue(response.getMatchingDoctors().isEmpty());
    }
}
