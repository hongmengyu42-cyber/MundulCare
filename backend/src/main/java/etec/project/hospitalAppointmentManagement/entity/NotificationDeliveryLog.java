package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_delivery_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String channel; // "IN_APP", "TELEGRAM", "EMAIL"

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType; // "PAYMENT_RECEIVED", "PATIENT_CHECKED_IN", "APPOINTMENT_BOOKED"

    @Column(name = "recipient_target", length = 120)
    private String recipientTarget; // Chat ID, User ID, or Role

    @Column(name = "branch_name", length = 150)
    private String branchName;

    @Column(name = "department_name", length = 120)
    private String departmentName;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "message_preview", columnDefinition = "TEXT")
    private String messagePreview;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SENT"; // "SENT", "FAILED"

    @Column(name = "error_details", columnDefinition = "TEXT")
    private String errorDetails;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
