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
public class CancelPrescriptionRequest {
    @NotBlank(message = "Cancellation reason is required")
    private String cancelReason;
}
