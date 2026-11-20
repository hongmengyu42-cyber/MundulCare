package etec.project.hospitalAppointmentManagement.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleUpdateRequest {
    @Min(value = 10, message = "Appointment duration must be at least 10 minutes")
    @Max(value = 180, message = "Appointment duration cannot exceed 180 minutes")
    private Integer appointmentDurationMinutes;

    @NotNull(message = "Schedules list is required")
    @Valid
    private List<DoctorScheduleDto> schedules;
}
