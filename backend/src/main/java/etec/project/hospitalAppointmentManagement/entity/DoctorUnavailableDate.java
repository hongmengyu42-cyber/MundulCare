package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "doctor_unavailable_dates",
        uniqueConstraints = @UniqueConstraint(columnNames = {"doctor_id", "unavailable_date"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorUnavailableDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "doctor_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Doctor doctor;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "unavailable_date", nullable = false)
    private LocalDate unavailableDate;

    @Column(length = 255)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
