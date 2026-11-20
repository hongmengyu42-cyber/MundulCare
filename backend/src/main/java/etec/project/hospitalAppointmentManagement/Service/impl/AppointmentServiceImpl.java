package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.*;
import etec.project.hospitalAppointmentManagement.Service.AppointmentService;
import etec.project.hospitalAppointmentManagement.Service.EmailService;
import etec.project.hospitalAppointmentManagement.Service.NotificationService;
import etec.project.hospitalAppointmentManagement.dto.request.BookAppointmentRequest;
import etec.project.hospitalAppointmentManagement.dto.request.CompleteConsultationRequest;
import etec.project.hospitalAppointmentManagement.dto.request.UpdateAppointmentStatusRequest;
import etec.project.hospitalAppointmentManagement.dto.response.AppointmentResponse;
import etec.project.hospitalAppointmentManagement.entity.Appointment;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.DoctorSchedule;
import etec.project.hospitalAppointmentManagement.entity.MedicalRecord;
import etec.project.hospitalAppointmentManagement.entity.User;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import etec.project.hospitalAppointmentManagement.enums.NotificationType;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepo appointmentRepo;
    private final DoctorRepo doctorRepo;
    private final DoctorScheduleRepo doctorScheduleRepo;
    private final DoctorUnavailableDateRepo doctorUnavailableDateRepo;
    private final MedicalRecordRepo medicalRecordRepo;
    private final UserRepo userRepo;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public AppointmentResponse bookAppointment(Long userId, BookAppointmentRequest request) {
        User patient = userRepo.findById(userId)
                .orElseThrow(() -> new NotFound("Patient account not found with ID: " + userId));

        Doctor doctor = doctorRepo.findById(request.getDoctorId())
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + request.getDoctorId()));

        if (!doctor.isActive()) {
            throw new RuntimeException("This doctor is currently not accepting appointments.");
        }

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new RuntimeException("Start time must be before end time.");
        }

        // Check if date is blocked as unavailable by the doctor
        if (doctorUnavailableDateRepo.existsByDoctorIdAndUnavailableDate(doctor.getId(), request.getAppointmentDate())) {
            throw new RuntimeException(doctor.getName() + " is unavailable on " + request.getAppointmentDate() +
                    ". Please choose another date.");
        }

        // Check if slot overlaps with doctor's configured break window on that day
        String dayName = request.getAppointmentDate().getDayOfWeek().name();
        List<DoctorSchedule> daySchedules = doctorScheduleRepo.findByDoctorId(doctor.getId()).stream()
                .filter(s -> dayName.equalsIgnoreCase(s.getDayOfWeek()) && s.isAvailable())
                .toList();
        for (DoctorSchedule sch : daySchedules) {
            if (sch.getBreakStart() != null && sch.getBreakEnd() != null) {
                LocalTime bs = sch.getBreakStart();
                LocalTime be = sch.getBreakEnd();
                boolean overlapsBreak = request.getStartTime().isBefore(be) && request.getEndTime().isAfter(bs);
                if (overlapsBreak) {
                    throw new RuntimeException("This time slot overlaps with " + doctor.getName() +
                            "'s break time (" + bs + " - " + be + "). Please choose another slot.");
                }
            }
        }

        // Double-booking conflict check
        boolean isBooked = appointmentRepo.isDoctorSlotBooked(
                doctor.getId(),
                request.getAppointmentDate(),
                request.getStartTime(),
                request.getEndTime()
        );

        if (isBooked) {
            throw new RuntimeException("This time slot is already booked for " + doctor.getName() +
                    ". Please choose a different time slot or date.");
        }

        String phone = (request.getPatientPhone() != null && !request.getPatientPhone().trim().isEmpty())
                ? request.getPatientPhone().trim()
                : patient.getPhone();

        String paymentMethod = request.getPaymentMethod();
        String paymentStatus = "PENDING_AT_CLINIC";
        Double paidAmount = request.getPaidAmount() != null ? request.getPaidAmount() : doctor.getConsultationFee();
        String paymentTxnId = request.getPaymentTransactionId();
        LocalDateTime paidAt = null;

        if (paymentMethod != null && !paymentMethod.isBlank()) {
            if ("KHQR".equalsIgnoreCase(paymentMethod) || "BAKONG".equalsIgnoreCase(paymentMethod) || "CREDIT_CARD".equalsIgnoreCase(paymentMethod)) {
                paymentStatus = request.getPaymentStatus() != null ? request.getPaymentStatus() : "PAID";
                if ("PAID".equalsIgnoreCase(paymentStatus)) {
                    paidAt = LocalDateTime.now();
                    if (paymentTxnId == null || paymentTxnId.isBlank()) {
                        paymentTxnId = "TXN-" + System.currentTimeMillis();
                    }
                }
            } else if ("CASH".equalsIgnoreCase(paymentMethod)) {
                paymentStatus = "PENDING_AT_CLINIC";
            }
        }

        Appointment appointment = Appointment.builder()
                .doctor(doctor)
                .patientUser(patient)
                .patientName(patient.getName())
                .patientEmail(patient.getEmail())
                .patientPhone(phone)
                .appointmentDate(request.getAppointmentDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .reason(request.getReason().trim())
                .status(AppointmentStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .paidAmount(paidAmount)
                .paymentTransactionId(paymentTxnId)
                .paidAt(paidAt)
                .build();

        appointment = appointmentRepo.save(appointment);

        // Create in-app notifications for Doctor and Patient
        if (doctor.getUser() != null) {
            notificationService.notifyUser(
                    doctor.getUser(),
                    NotificationType.APPOINTMENT_REQUESTED,
                    "New Appointment Request",
                    patient.getName() + " requested an appointment on " + appointment.getAppointmentDate() +
                            " at " + appointment.getStartTime() + ".",
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/appointments"
            );
        }
        notificationService.notifyUser(
                patient,
                NotificationType.APPOINTMENT_REQUESTED,
                "Appointment Request Submitted",
                "Your appointment request with " + doctor.getName() + " on " + appointment.getAppointmentDate() +
                        " at " + appointment.getStartTime() + " is pending confirmation.",
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        // Send automated notification emails to Admin (for review) and Patient (receipt)
        try {
            Optional<User> adminUser = userRepo.findFirstByRole(Role.ADMIN);
            if (adminUser.isPresent()) {
                emailService.sendAdminBookingNotification(appointment, adminUser.get().getEmail());
            } else {
                log.warn("No ADMIN user found - skipping admin booking notification email.");
            }
            emailService.sendPatientBookingConfirmation(appointment);
        } catch (Exception e) {
            log.error("Failed to send booking notification emails: {}", e.getMessage());
        }

        return mapToResponse(appointment);
    }

    @Override
    public List<AppointmentResponse> getMyAppointments(Long userId) {
        List<Appointment> appointments = appointmentRepo.findByPatientUserIdOrderByAppointmentDateDescStartTimeDesc(userId);
        return appointments.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<AppointmentResponse> getAllAppointments() {
        List<Appointment> appointments = appointmentRepo.findAllByOrderByAppointmentDateDescStartTimeDesc();
        return appointments.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AppointmentResponse cancelAppointment(Long appointmentId, Long userId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFound("User not found with ID: " + userId));

        // Ensure user owns this appointment or is Admin
        if (!appointment.getPatientUser().getId().equals(userId) && user.getRole() != Role.ADMIN) {
            throw new RuntimeException("You are not authorized to cancel this appointment.");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new RuntimeException("Appointment is already cancelled.");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel an already completed appointment.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledByRole(user.getRole().name());
        appointment = appointmentRepo.save(appointment);

        if (appointment.getDoctor().getUser() != null) {
            notificationService.notifyUser(
                    appointment.getDoctor().getUser(),
                    NotificationType.APPOINTMENT_CANCELLED,
                    "Appointment Cancelled",
                    appointment.getPatientName() + " cancelled their appointment scheduled for " +
                            appointment.getAppointmentDate() + " at " + appointment.getStartTime() + ".",
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/appointments"
            );
        }

        // Send cancellation email to Doctor
        try {
            emailService.sendDoctorCancellationNotification(appointment);
        } catch (Exception e) {
            log.error("Failed to send doctor cancellation email: {}", e.getMessage());
        }

        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse updateStatus(Long appointmentId, UpdateAppointmentStatusRequest request) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        appointment.setStatus(request.getStatus());
        if (request.getRejectionReason() != null && !request.getRejectionReason().trim().isEmpty()) {
            appointment.setRejectionReason(request.getRejectionReason().trim());
        }

        appointment = appointmentRepo.save(appointment);

        NotificationType notifType = switch (request.getStatus()) {
            case CONFIRMED -> NotificationType.APPOINTMENT_CONFIRMED;
            case REJECTED -> NotificationType.APPOINTMENT_REJECTED;
            case COMPLETED -> NotificationType.APPOINTMENT_COMPLETED;
            case CANCELLED -> NotificationType.APPOINTMENT_CANCELLED;
            default -> NotificationType.SYSTEM;
        };

        notificationService.notifyUser(
                appointment.getPatientUser(),
                notifType,
                "Appointment " + request.getStatus().name(),
                "Your appointment with " + appointment.getDoctor().getName() + " on " +
                        appointment.getAppointmentDate() + " is now " + request.getStatus().name() + ".",
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        if (appointment.getDoctor().getUser() != null) {
            notificationService.notifyUser(
                    appointment.getDoctor().getUser(),
                    notifType,
                    "Appointment " + request.getStatus().name(),
                    "Appointment #" + appointment.getId() + " with " + appointment.getPatientName() + " on " +
                            appointment.getAppointmentDate() + " was updated to " + request.getStatus().name() + ".",
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/appointments"
            );
        }

        // Notify both Patient and Doctor of the Admin's decision
        try {
            emailService.sendPatientStatusUpdate(appointment);
            emailService.sendDoctorStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send status update emails: {}", e.getMessage());
        }

        return mapToResponse(appointment);
    }

    @Override
    public AppointmentResponse getAppointmentById(Long appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));
        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse checkIn(Long appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        if (appointment.getQueueNumber() == null || appointment.getQueueNumber().isBlank()) {
            long count = appointmentRepo.countByAppointmentDateAndQueueNumberIsNotNull(appointment.getAppointmentDate());
            String qNum = "A-" + String.format("%03d", count + 1);
            appointment.setQueueNumber(qNum);
        }

        appointment.setQueueStatus("WAITING");
        appointment.setCheckInTime(LocalDateTime.now());
        if (appointment.getRoomNumber() == null || appointment.getRoomNumber().isBlank()) {
            String room = appointment.getDoctor().getAddress();
            appointment.setRoomNumber((room != null && !room.isBlank()) ? room : "Consultation Room 1");
        }

        appointment = appointmentRepo.save(appointment);

        // Notify patient
        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.SYSTEM,
                "Checked In: Queue Ticket " + appointment.getQueueNumber(),
                "Welcome to MundulCare! Your ticket is " + appointment.getQueueNumber() + ". Please wait in the waiting lounge.",
                appointment.getId(),
                "APPOINTMENT",
                "/my-appointments"
        );

        // Notify doctor
        if (appointment.getDoctor().getUser() != null) {
            notificationService.notifyUser(
                    appointment.getDoctor().getUser(),
                    NotificationType.SYSTEM,
                    "Patient Checked In (" + appointment.getQueueNumber() + ")",
                    appointment.getPatientName() + " has arrived and is waiting in the lounge.",
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/appointments"
            );
        }

        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse callQueue(Long appointmentId, String roomNumber) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        appointment.setQueueStatus("CALLING");
        if (roomNumber != null && !roomNumber.isBlank()) {
            appointment.setRoomNumber(roomNumber.trim());
        }

        appointment = appointmentRepo.save(appointment);

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.SYSTEM,
                "Now Calling: Ticket " + appointment.getQueueNumber(),
                "Dr. " + appointment.getDoctor().getName() + " is ready for you in " + appointment.getRoomNumber() + ". Please proceed now.",
                appointment.getId(),
                "APPOINTMENT",
                "/my-appointments"
        );

        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse startConsultation(Long appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        appointment.setQueueStatus("IN_CONSULTATION");
        appointment = appointmentRepo.save(appointment);
        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse completeConsultation(Long appointmentId, CompleteConsultationRequest request) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setQueueStatus("COMPLETED");
        appointment.setCompletedAt(LocalDateTime.now());
        if (request.getDiagnosis() != null) appointment.setDiagnosis(request.getDiagnosis().trim());
        if (request.getClinicalNotes() != null) appointment.setClinicalNotes(request.getClinicalNotes().trim());
        if (request.getPrescribedMedications() != null) appointment.setPrescribedMedications(request.getPrescribedMedications().trim());

        appointment = appointmentRepo.save(appointment);

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_COMPLETED,
                "Consultation Completed & Prescription Ready",
                "Your consultation with Dr. " + appointment.getDoctor().getName() + " is complete. Your digital prescription note is now available.",
                appointment.getId(),
                "APPOINTMENT",
                "/my-appointments"
        );

        return mapToResponse(appointment);
    }

    @Override
    public List<AppointmentResponse> getLiveQueue(String branchName) {
        LocalDate today = LocalDate.now();
        List<Appointment> list = appointmentRepo.findByAppointmentDate(today);

        return list.stream()
                .filter(a -> a.getQueueNumber() != null && !a.getQueueNumber().isBlank())
                .filter(a -> {
                    if (branchName == null || branchName.isBlank() || branchName.equalsIgnoreCase("all")) {
                        return true;
                    }
                    String docBranch = a.getDoctor().getBranchName();
                    return docBranch != null && docBranch.equalsIgnoreCase(branchName.trim());
                })
                .sorted(Comparator.comparing(Appointment::getCheckInTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        Optional<MedicalRecord> recordOpt = medicalRecordRepo.findByAppointmentId(appointment.getId());
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .doctorId(appointment.getDoctor().getId())
                .doctorName(appointment.getDoctor().getName())
                .doctorEmail(appointment.getDoctor().getEmail())
                .doctorAddress(appointment.getDoctor().getAddress())
                .branchName(appointment.getDoctor().getBranchName() != null && !appointment.getDoctor().getBranchName().isBlank()
                        ? appointment.getDoctor().getBranchName()
                        : "MundulCare Main Campus (Phnom Penh)")
                .consultationFee(appointment.getDoctor().getConsultationFee())
                .patientUserId(appointment.getPatientUser().getId())
                .patientName(appointment.getPatientName())
                .patientEmail(appointment.getPatientEmail())
                .patientPhone(appointment.getPatientPhone())
                .appointmentDate(appointment.getAppointmentDate())
                .startTime(appointment.getStartTime())
                .endTime(appointment.getEndTime())
                .reason(appointment.getReason())
                .status(appointment.getStatus())
                .rejectionReason(appointment.getRejectionReason())
                .cancellationReason(appointment.getCancellationReason())
                .cancelledByRole(appointment.getCancelledByRole())
                .rescheduledFromDate(appointment.getRescheduledFromDate())
                .rescheduledFromStart(appointment.getRescheduledFromStart())
                .rescheduledFromEnd(appointment.getRescheduledFromEnd())
                .hasMedicalRecord(recordOpt.isPresent())
                .medicalRecordId(recordOpt.map(MedicalRecord::getId).orElse(null))
                .queueNumber(appointment.getQueueNumber())
                .queueStatus(appointment.getQueueStatus())
                .checkInTime(appointment.getCheckInTime())
                .roomNumber(appointment.getRoomNumber())
                .paymentStatus(appointment.getPaymentStatus())
                .paymentMethod(appointment.getPaymentMethod())
                .paidAmount(appointment.getPaidAmount())
                .paymentTransactionId(appointment.getPaymentTransactionId())
                .paidAt(appointment.getPaidAt())
                .diagnosis(appointment.getDiagnosis())
                .clinicalNotes(appointment.getClinicalNotes())
                .prescribedMedications(appointment.getPrescribedMedications())
                .completedAt(appointment.getCompletedAt())
                .createdAt(appointment.getCreatedAt())
                .build();
    }
}
