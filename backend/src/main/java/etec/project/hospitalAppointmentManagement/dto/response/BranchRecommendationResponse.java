package etec.project.hospitalAppointmentManagement.dto.response;

import etec.project.hospitalAppointmentManagement.entity.HospitalBranch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchRecommendationResponse {
    private String userProvince;
    private HospitalBranch recommendedBranch;
    private double estimatedDistanceKm;
    private String estimatedTravelTime;
    private String note;
    private int availableDoctorsCount;
}
