package etec.project.hospitalAppointmentManagement.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {

    private Long id;

    // Doctor info
    private Long doctorId;
    private String doctorName;
    private String doctorEmail;
    private String doctorAddress;
    private String branchName;
    private Double consultationFee;

    // Patient info
    private Long patientUserId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;

    // Appointment info
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private String reason;
    private AppointmentStatus status;
    private String rejectionReason;
    private String cancellationReason;
    private String cancelledByRole;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate rescheduledFromDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime rescheduledFromStart;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime rescheduledFromEnd;

    private Boolean hasMedicalRecord;
    private Long medicalRecordId;

    // --- Waiting Room Queue & Check-In ---
    private String queueNumber;
    private String queueStatus;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime checkInTime;
    private String roomNumber;

    // --- KHQR / Bakong / Card Payment ---
    private String paymentStatus;
    private String paymentMethod;
    private Double paidAmount;
    private String paymentTransactionId;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime paidAt;

    // --- Post-Consultation Summary & Digital Prescription ---
    private String diagnosis;
    private String clinicalNotes;
    private String prescribedMedications;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
