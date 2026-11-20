package etec.project.hospitalAppointmentManagement.dto.response;

import etec.project.hospitalAppointmentManagement.dto.request.DoctorScheduleDto;
import etec.project.hospitalAppointmentManagement.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DoctorResponse {
    private Long id;
    private Long userId;
    private Boolean hasAccount;
    private String accountEmail;
    private String name;
    private String email;
    private String phone;
    private Gender gender;
    private String profileImage;
    private String licenseNumber;
    private String bio;
    private String qualifications;
    private int experienceYears;
    private Double consultationFee;
    private String address;
    private String branchName;
    private Integer appointmentDurationMinutes;
    private Boolean isActive;
    private List<SpecialtyResponse> specialties;
    private List<DoctorScheduleDto> schedules;
    private List<UnavailableDateResponse> unavailableDates;
}
