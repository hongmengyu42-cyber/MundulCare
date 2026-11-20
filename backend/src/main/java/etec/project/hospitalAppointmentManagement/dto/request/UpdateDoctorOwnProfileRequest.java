package etec.project.hospitalAppointmentManagement.dto.request;

import etec.project.hospitalAppointmentManagement.enums.Gender;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDoctorOwnProfileRequest {
    private String phone;
    private Gender gender;
    private String bio;
    private String qualifications;
    private String address;

    @Min(value = 10, message = "Appointment duration must be at least 10 minutes")
    @Max(value = 180, message = "Appointment duration cannot exceed 180 minutes")
    private Integer appointmentDurationMinutes;
}
