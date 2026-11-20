package etec.project.hospitalAppointmentManagement.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import etec.project.hospitalAppointmentManagement.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorPatientSummaryResponse {
    private Long patientUserId;
    private String patientCode; // e.g. "PT-00012"
    private String name;
    private String email;
    private String phone;
    private String profileImage;
    private Gender gender;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String bloodType;
    private String allergies;
    private String chronicConditions;
    private long totalVisitsWithMe;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate lastVisitDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate nextAppointmentDate;

    private String latestDiagnosis;
}
