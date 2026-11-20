package etec.project.hospitalAppointmentManagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorPatientDetailResponse {
    private Long patientUserId;
    private String patientCode;
    private String name;
    private String email;
    private String phone;
    private String profileImage;
    private PatientMedicalProfileResponse medicalProfile;
    private List<AppointmentResponse> appointments;
    private List<MedicalRecordResponse> medicalRecords;
    private List<PrescriptionResponse> prescriptions;
}
