package etec.project.hospitalAppointmentManagement.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordResponse {
    private Long id;
    private Long patientUserId;
    private String patientCode;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private Long appointmentId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;

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

    private int version;
    private Boolean isEditableByCurrentDoctor;
    private List<MedicalRecordRevisionResponse> revisions;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
