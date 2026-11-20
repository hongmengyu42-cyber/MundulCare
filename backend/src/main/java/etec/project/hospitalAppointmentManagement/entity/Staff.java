package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import etec.project.hospitalAppointmentManagement.enums.Gender;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_staff")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false, unique = true, length = 50)
    private String employeeId; // e.g., "STF-2026-001"

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 40)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Column(name = "staff_role", nullable = false, length = 60)
    private String staffRole; // e.g., REGISTERED_NURSE, HEAD_NURSE, RECEPTIONIST, PHARMACIST, LAB_TECHNICIAN, CASHIER, CARE_COORDINATOR

    @Column(name = "department_name", length = 120)
    private String departmentName;

    @Column(name = "branch_name", length = 150)
    private String branchName;

    @Column(name = "shift", length = 40)
    @Builder.Default
    private String shift = "MORNING"; // MORNING, AFTERNOON, NIGHT, FULL_DAY

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @JsonProperty("isActive")
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @JsonProperty("isActive")
    public boolean getIsActive() {
        return isActive;
    }

    public boolean isActive() {
        return isActive;
    }

    @JsonProperty("isActive")
    public void setIsActive(boolean isActive) {
        this.isActive = isActive;
    }

    public void setActive(boolean active) {
        this.isActive = active;
    }

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
