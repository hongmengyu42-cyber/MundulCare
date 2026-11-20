package etec.project.hospitalAppointmentManagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitiatePaymentRequest {

    @NotNull(message = "Appointment ID is required")
    private Long appointmentId;

    private String paymentMethod; // Default KHQR

    private String currency; // Default USD
}
