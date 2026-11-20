package etec.project.hospitalAppointmentManagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemResponse {
    private Long id;
    private String medicationName;
    private String dosage;
    private String frequency;
    private String duration;
    private String quantity;
    private String instructions;
}
