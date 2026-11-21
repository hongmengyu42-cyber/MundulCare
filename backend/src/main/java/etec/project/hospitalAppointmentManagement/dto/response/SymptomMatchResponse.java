package etec.project.hospitalAppointmentManagement.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomMatchResponse {

    @Builder.Default
    private boolean medicalRelated = true; // true if inquiry is a medical/symptom/specialist inquiry; false if off-topic
    private String detectedSpecialty; // e.g. "Cardiology" (null if not medical)
    private String clinicalExplanation; // Friendly explanation of why this specialist is recommended or scope notice
    private String recommendedBranch; // e.g. "MundulCare Siem Reap Branch"
    private String userProvince; // e.g. "Siem Reap"
    private List<DoctorResponse> matchingDoctors; // Real doctors fetched from database (empty if not medical)
}
