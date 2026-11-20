package etec.project.hospitalAppointmentManagement.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmendMedicalRecordRequest {
    private String symptoms;
    private Integer bloodPressureSystolic;
    private Integer bloodPressureDiastolic;
    private Integer heartRate;
    private Double temperatureC;
    private Integer respiratoryRate;
    private Integer oxygenSaturation;

    @NotBlank(message = "Diagnosis is required")
    private String diagnosis;

    private String treatmentPlan;
    private String clinicalNotes;
    private String followUpRecommendation;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate followUpDate;

    @NotBlank(message = "Amendment reason is required to preserve audit history")
    private String amendmentReason;
}
