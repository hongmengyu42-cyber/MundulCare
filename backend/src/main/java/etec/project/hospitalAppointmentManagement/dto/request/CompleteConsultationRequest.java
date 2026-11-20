package etec.project.hospitalAppointmentManagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteConsultationRequest {

    @NotBlank(message = "Clinical diagnosis is required when completing a consultation")
    private String diagnosis;

    private String clinicalNotes;

    // JSON formatted list of prescribed medications (or text)
    private String prescribedMedications;
}
