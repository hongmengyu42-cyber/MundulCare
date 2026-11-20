package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_branches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HospitalBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code; // e.g., "MC-PNH-01"

    @Column(nullable = false, length = 150)
    private String name; // e.g., "MundulCare Main Campus (Phnom Penh)"

    @Column(nullable = false, length = 100)
    private String city; // e.g., "Phnom Penh"

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 40)
    private String phone;

    @Column(length = 120)
    private String email;

    @Column(name = "operating_hours", length = 150)
    private String operatingHours;

    @Column(name = "manager_name", length = 120)
    private String managerName;

    @JsonProperty("isMainCampus")
    @Column(name = "is_main_campus", nullable = false)
    @Builder.Default
    private boolean isMainCampus = false;

    @JsonProperty("isActive")
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
