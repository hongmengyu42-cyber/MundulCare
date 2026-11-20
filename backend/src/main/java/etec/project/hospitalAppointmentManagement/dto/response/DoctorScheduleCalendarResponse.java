package etec.project.hospitalAppointmentManagement.dto.response;

import etec.project.hospitalAppointmentManagement.dto.request.DoctorScheduleDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleCalendarResponse {
    private Integer appointmentDurationMinutes;
    private List<DoctorScheduleDto> weeklySchedules;
    private List<UnavailableDateResponse> unavailableDates;
    private List<AppointmentResponse> appointments;
}
