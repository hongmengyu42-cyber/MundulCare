package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "patient_user_id", nullable = false)
    private User patientUser;

    @Column(name = "patient_name", nullable = false)
    private String patientName;

    @Column(name = "patient_email", nullable = false)
    private String patientEmail;

    @Column(name = "patient_phone")
    private String patientPhone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @JsonFormat(pattern = "HH:mm")
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason; // Symptoms or purpose of visit

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "cancelled_by_role", length = 20)
    private String cancelledByRole;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "rescheduled_from_date")
    private LocalDate rescheduledFromDate;

    @JsonFormat(pattern = "HH:mm")
    @Column(name = "rescheduled_from_start")
    private LocalTime rescheduledFromStart;

    @JsonFormat(pattern = "HH:mm")
    @Column(name = "rescheduled_from_end")
    private LocalTime rescheduledFromEnd;

    // --- Waiting Room Queue & Check-In ---
    @Column(name = "queue_number", length = 20)
    private String queueNumber; // e.g., "A-012"

    @Column(name = "queue_status", length = 30)
    private String queueStatus; // "WAITING", "CALLING", "IN_CONSULTATION", "COMPLETED"

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "room_number", length = 80)
    private String roomNumber; // e.g., "Room 301, Building A"

    // --- KHQR / Bakong / Card Payment ---
    @Column(name = "payment_status", length = 30)
    @Builder.Default
    private String paymentStatus = "PENDING"; // "PENDING", "PAID", "PENDING_AT_CLINIC", "REFUNDED"

    @Column(name = "payment_method", length = 30)
    private String paymentMethod; // "KHQR", "BAKONG", "CREDIT_CARD", "CASH"

    @Column(name = "paid_amount")
    private Double paidAmount;

    @Column(name = "payment_transaction_id", length = 80)
    private String paymentTransactionId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // --- Post-Consultation Summary & Digital Prescription ---
    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "prescribed_medications", columnDefinition = "TEXT")
    private String prescribedMedications; // JSON string of prescribed medication items

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
