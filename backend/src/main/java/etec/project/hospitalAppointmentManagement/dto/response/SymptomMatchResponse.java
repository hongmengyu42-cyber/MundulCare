package etec.project.hospitalAppointmentManagement.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomMatchResponse {

    private String detectedSpecialty; // e.g. "Cardiology"
    private String clinicalExplanation; // Friendly explanation of why this specialist is recommended
    private String recommendedBranch; // e.g. "MundulCare Siem Reap Branch"
    private String userProvince; // e.g. "Siem Reap"
    private List<DoctorResponse> matchingDoctors; // Real doctors fetched from database
}
