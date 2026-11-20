package etec.project.hospitalAppointmentManagement.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordRevisionResponse {
    private Long id;
    private int version;
    private String symptoms;
    private Integer bloodPressureSystolic;
    private Integer bloodPressureDiastolic;
    private Integer heartRate;
    private Double temperatureC;
    private Integer respiratoryRate;
    private Integer oxygenSaturation;
    private String diagnosis;
    private String treatmentPlan;
    private String clinicalNotes;
    private String followUpRecommendation;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate followUpDate;

    private Long amendedByDoctorId;
    private String amendedByDoctorName;
    private String amendmentReason;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
