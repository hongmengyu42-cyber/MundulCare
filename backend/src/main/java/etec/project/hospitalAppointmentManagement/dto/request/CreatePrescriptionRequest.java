package etec.project.hospitalAppointmentManagement.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
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
public class CreatePrescriptionRequest {
    @NotNull(message = "Patient ID is required")
    private Long patientUserId;

    private Long appointmentId;
    private Long medicalRecordId;
    private String diagnosisSummary;
    private String notes;

    @NotEmpty(message = "At least one medication item is required")
    @Valid
    private List<PrescriptionItemRequest> items;
}
