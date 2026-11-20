package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.*;
import etec.project.hospitalAppointmentManagement.Service.*;
import etec.project.hospitalAppointmentManagement.dto.request.*;
import etec.project.hospitalAppointmentManagement.dto.response.*;
import etec.project.hospitalAppointmentManagement.entity.*;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import etec.project.hospitalAppointmentManagement.enums.NotificationType;
import etec.project.hospitalAppointmentManagement.enums.PrescriptionStatus;
import etec.project.hospitalAppointmentManagement.exception.Forbidden;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorPortalServiceImpl implements DoctorPortalService {

    private final DoctorRepo doctorRepo;
    private final DoctorScheduleRepo doctorScheduleRepo;
    private final DoctorUnavailableDateRepo doctorUnavailableDateRepo;
    private final AppointmentRepo appointmentRepo;
    private final UserRepo userRepo;
    private final PatientMedicalProfileRepo patientMedicalProfileRepo;
    private final MedicalRecordRepo medicalRecordRepo;
    private final MedicalRecordRevisionRepo medicalRecordRevisionRepo;
    private final PrescriptionRepo prescriptionRepo;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final DoctorService doctorService;

    // -------------------------------------------------------------------------
    // 1. DASHBOARD
    // -------------------------------------------------------------------------

    @Override
    public DoctorDashboardResponse getDashboard(Doctor doctor) {
        LocalDate today = LocalDate.now();
        List<Appointment> allAppointments = appointmentRepo.findByDoctorIdOrderByAppointmentDateDescStartTimeDesc(doctor.getId());

        long totalAppointments = allAppointments.size();
        long todayCount = allAppointments.stream()
                .filter(a -> today.equals(a.getAppointmentDate()) && a.getStatus() != AppointmentStatus.CANCELLED && a.getStatus() != AppointmentStatus.REJECTED)
                .count();
        long upcomingCount = allAppointments.stream()
                .filter(a -> !a.getAppointmentDate().isBefore(today) && a.getStatus() == AppointmentStatus.CONFIRMED)
                .count();
        long completedCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .count();
        long pendingCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.PENDING)
                .count();
        long cancelledCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CANCELLED)
                .count();
        long rejectedCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.REJECTED)
                .count();

        List<User> authorizedPatients = appointmentRepo.findAuthorizedPatientsForDoctor(doctor.getId());
        long totalRecords = medicalRecordRepo.findByDoctorIdOrderByCreatedAtDesc(doctor.getId()).size();
        long totalPrescriptions = prescriptionRepo.findByDoctorIdOrderByCreatedAtDesc(doctor.getId()).size();
        long unreadNotifications = doctor.getUser() != null
                ? notificationService.getUnreadCount(doctor.getUser().getId())
                : 0L;

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        statusBreakdown.put("PENDING", pendingCount);
        statusBreakdown.put("CONFIRMED", allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count());
        statusBreakdown.put("COMPLETED", completedCount);
        statusBreakdown.put("CANCELLED", cancelledCount);
        statusBreakdown.put("REJECTED", rejectedCount);

        // Build 7-day trend (last 4 days + today + next 2 days so upcoming & recent are both visible)
        List<DoctorDashboardResponse.DailyStatPoint> weeklyTrend = new ArrayList<>();
        for (int i = -4; i <= 2; i++) {
            LocalDate d = today.plusDays(i);
            List<Appointment> onDay = allAppointments.stream()
                    .filter(a -> d.equals(a.getAppointmentDate()))
                    .toList();
            weeklyTrend.add(DoctorDashboardResponse.DailyStatPoint.builder()
                    .date(d.toString())
                    .label(d.equals(today) ? "Today" : d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .total(onDay.size())
                    .completed(onDay.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count())
                    .confirmed(onDay.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count())
                    .pending(onDay.stream().filter(a -> a.getStatus() == AppointmentStatus.PENDING).count())
                    .build());
        }

        List<AppointmentResponse> todaySchedule = allAppointments.stream()
                .filter(a -> today.equals(a.getAppointmentDate()))
                .sorted(Comparator.comparing(Appointment::getStartTime))
                .map(this::mapAppointment)
                .collect(Collectors.toList());

        List<AppointmentResponse> pendingRequests = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.PENDING)
                .sorted(Comparator.comparing(Appointment::getAppointmentDate).thenComparing(Appointment::getStartTime))
                .limit(10)
                .map(this::mapAppointment)
                .collect(Collectors.toList());

        List<AppointmentResponse> upcomingAppointments = allAppointments.stream()
                .filter(a -> !a.getAppointmentDate().isBefore(today) && a.getStatus() == AppointmentStatus.CONFIRMED)
                .sorted(Comparator.comparing(Appointment::getAppointmentDate).thenComparing(Appointment::getStartTime))
                .limit(10)
                .map(this::mapAppointment)
                .collect(Collectors.toList());

        return DoctorDashboardResponse.builder()
                .doctorProfile(doctorService.getDoctorById(doctor.getId()))
                .totalAppointments(totalAppointments)
                .todayAppointmentsCount(todayCount)
                .upcomingAppointmentsCount(upcomingCount)
                .completedAppointmentsCount(completedCount)
                .pendingRequestsCount(pendingCount)
                .cancelledAppointmentsCount(cancelledCount)
                .rejectedAppointmentsCount(rejectedCount)
                .totalAssignedPatients(authorizedPatients.size())
                .totalMedicalRecordsAuthored(totalRecords)
                .totalPrescriptionsIssued(totalPrescriptions)
                .unreadNotificationsCount(unreadNotifications)
                .statusBreakdown(statusBreakdown)
                .weeklyTrend(weeklyTrend)
                .todaySchedule(todaySchedule)
                .pendingRequests(pendingRequests)
                .upcomingAppointments(upcomingAppointments)
                .build();
    }

    // -------------------------------------------------------------------------
    // 2. DOCTOR PROFILE MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public DoctorResponse getOwnProfile(Doctor doctor) {
        return doctorService.getDoctorById(doctor.getId());
    }

    @Override
    @Transactional
    public DoctorResponse updateOwnProfile(Doctor doctor, UpdateDoctorOwnProfileRequest request) {
        Doctor managed = doctorRepo.findById(doctor.getId())
                .orElseThrow(() -> new NotFound("Doctor profile not found"));

        if (request.getPhone() != null) {
            managed.setPhone(request.getPhone().trim());
        }
        if (request.getGender() != null) {
            managed.setGender(request.getGender());
        }
        if (request.getBio() != null) {
            managed.setBio(request.getBio().trim());
        }
        if (request.getQualifications() != null) {
            managed.setQualifications(request.getQualifications().trim());
        }
        if (request.getAddress() != null) {
            managed.setAddress(request.getAddress().trim());
        }
        if (request.getAppointmentDurationMinutes() != null) {
            managed.setAppointmentDurationMinutes(request.getAppointmentDurationMinutes());
        }

        doctorRepo.save(managed);

        if (managed.getUser() != null) {
            User linkedUser = managed.getUser();
            if (request.getPhone() != null) {
                linkedUser.setPhone(request.getPhone().trim());
            }
            userRepo.save(linkedUser);
            auditLogService.log(linkedUser, "DOCTOR_UPDATED_OWN_PROFILE", "DOCTOR", managed.getId(),
                    "Doctor updated personal profile details");
        }

        return doctorService.getDoctorById(managed.getId());
    }

    @Override
    @Transactional
    public String uploadOwnProfileImage(Doctor doctor, MultipartFile file) {
        return doctorService.uploadProfileImage(doctor.getId(), file);
    }

    @Override
    @Transactional
    public void deleteOwnProfileImage(Doctor doctor) {
        doctorService.deleteProfileImage(doctor.getId());
    }

    // -------------------------------------------------------------------------
    // 3. DOCTOR APPOINTMENT MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public List<AppointmentResponse> getMyAppointments(
            Doctor doctor,
            LocalDate date,
            LocalDate from,
            LocalDate to,
            AppointmentStatus status,
            String search
    ) {
        List<Appointment> appointments = appointmentRepo.findByDoctorIdOrderByAppointmentDateDescStartTimeDesc(doctor.getId());
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        return appointments.stream()
                .filter(a -> date == null || date.equals(a.getAppointmentDate()))
                .filter(a -> from == null || !a.getAppointmentDate().isBefore(from))
                .filter(a -> to == null || !a.getAppointmentDate().isAfter(to))
                .filter(a -> status == null || status == a.getStatus())
                .filter(a -> {
                    if (cleanSearch == null) return true;
                    String pName = a.getPatientName() != null ? a.getPatientName().toLowerCase() : "";
                    String pEmail = a.getPatientEmail() != null ? a.getPatientEmail().toLowerCase() : "";
                    String pPhone = a.getPatientPhone() != null ? a.getPatientPhone().toLowerCase() : "";
                    String reason = a.getReason() != null ? a.getReason().toLowerCase() : "";
                    String idStr = "#" + a.getId();
                    String pCode = formatPatientCode(a.getPatientUser().getId()).toLowerCase();
                    return pName.contains(cleanSearch)
                            || pEmail.contains(cleanSearch)
                            || pPhone.contains(cleanSearch)
                            || reason.contains(cleanSearch)
                            || idStr.contains(cleanSearch)
                            || pCode.contains(cleanSearch);
                })
                .map(this::mapAppointment)
                .collect(Collectors.toList());
    }

    @Override
    public AppointmentResponse getMyAppointmentDetail(Doctor doctor, Long appointmentId) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse confirmAppointment(Doctor doctor, Long appointmentId) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new RuntimeException("Only PENDING appointments can be confirmed. Current status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_CONFIRMED_APPOINTMENT", "APPOINTMENT", appointment.getId(),
                "Confirmed appointment #" + appointment.getId() + " for " + appointment.getPatientName());

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_CONFIRMED,
                "Appointment Confirmed",
                doctor.getName() + " confirmed your appointment on " + appointment.getAppointmentDate() +
                        " at " + appointment.getStartTime() + ".",
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send patient confirmation email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse rejectAppointment(Doctor doctor, Long appointmentId, DoctorAppointmentActionRequest request) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new RuntimeException("Only PENDING appointments can be rejected. Current status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setRejectionReason(request.getReason().trim());
        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_REJECTED_APPOINTMENT", "APPOINTMENT", appointment.getId(),
                "Rejected appointment #" + appointment.getId() + " (" + request.getReason().trim() + ")");

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_REJECTED,
                "Appointment Request Declined",
                doctor.getName() + " could not accept your appointment on " + appointment.getAppointmentDate() +
                        ". Reason: " + request.getReason().trim(),
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send patient rejection email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse cancelAppointment(Doctor doctor, Long appointmentId, DoctorAppointmentActionRequest request) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel an appointment with status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(request.getReason().trim());
        appointment.setCancelledByRole("DOCTOR");
        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_CANCELLED_APPOINTMENT", "APPOINTMENT", appointment.getId(),
                "Cancelled appointment #" + appointment.getId() + " (" + request.getReason().trim() + ")");

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_CANCELLED,
                "Appointment Cancelled by Doctor",
                doctor.getName() + " cancelled your appointment scheduled for " + appointment.getAppointmentDate() +
                        " at " + appointment.getStartTime() + ". Reason: " + request.getReason().trim(),
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send patient cancellation email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse completeAppointment(Doctor doctor, Long appointmentId) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new RuntimeException("Only CONFIRMED appointments can be marked as completed. Current status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        if (appointment.getQueueStatus() != null) appointment.setQueueStatus("COMPLETED");
        if (appointment.getCompletedAt() == null) appointment.setCompletedAt(LocalDateTime.now());
        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_COMPLETED_APPOINTMENT", "APPOINTMENT", appointment.getId(),
                "Marked appointment #" + appointment.getId() + " as COMPLETED for " + appointment.getPatientName());

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_COMPLETED,
                "Consultation Completed",
                "Your consultation with " + doctor.getName() + " on " + appointment.getAppointmentDate() + " has been marked completed.",
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send patient completion email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse callQueue(Doctor doctor, Long appointmentId, String roomNumber) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        appointment.setQueueStatus("CALLING");
        if (roomNumber != null && !roomNumber.isBlank()) {
            appointment.setRoomNumber(roomNumber.trim());
        } else if (appointment.getRoomNumber() == null || appointment.getRoomNumber().isBlank()) {
            appointment.setRoomNumber(doctor.getAddress() != null && !doctor.getAddress().isBlank() ? doctor.getAddress() : "Consultation Room 1");
        }
        appointment = appointmentRepo.save(appointment);

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.SYSTEM,
                "Now Calling: Ticket " + (appointment.getQueueNumber() != null ? appointment.getQueueNumber() : ""),
                "Dr. " + doctor.getName() + " is ready for you in " + appointment.getRoomNumber() + ". Please proceed to the room.",
                appointment.getId(),
                "APPOINTMENT",
                "/my-appointments"
        );

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse startConsultation(Doctor doctor, Long appointmentId) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        appointment.setQueueStatus("IN_CONSULTATION");
        appointment = appointmentRepo.save(appointment);
        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse completeConsultation(Doctor doctor, Long appointmentId, CompleteConsultationRequest request) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setQueueStatus("COMPLETED");
        appointment.setCompletedAt(LocalDateTime.now());
        if (request.getDiagnosis() != null) appointment.setDiagnosis(request.getDiagnosis().trim());
        if (request.getClinicalNotes() != null) appointment.setClinicalNotes(request.getClinicalNotes().trim());
        if (request.getPrescribedMedications() != null) appointment.setPrescribedMedications(request.getPrescribedMedications().trim());
        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_COMPLETED_CONSULTATION", "APPOINTMENT", appointment.getId(),
                "Completed consultation & issued prescription for " + appointment.getPatientName());

        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_COMPLETED,
                "Consultation Completed & Digital Prescription Ready",
                "Dr. " + doctor.getName() + " completed your consultation and issued your digital prescription note. You can view or download it now.",
                appointment.getId(),
                "APPOINTMENT",
                "/my-appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send patient completion email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse rescheduleAppointment(
            Doctor doctor,
            Long appointmentId,
            RescheduleAppointmentRequest request
    ) {
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        if (appointment.getStatus() != AppointmentStatus.PENDING && appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new RuntimeException("Only PENDING or CONFIRMED appointments can be rescheduled.");
        }

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new RuntimeException("Start time must be before end time.");
        }

        if (doctorUnavailableDateRepo.existsByDoctorIdAndUnavailableDate(doctor.getId(), request.getAppointmentDate())) {
            throw new RuntimeException("Cannot reschedule to " + request.getAppointmentDate() +
                    " because it is marked as an unavailable date on your schedule.");
        }

        // Check break window overlap
        String dayName = request.getAppointmentDate().getDayOfWeek().name();
        List<DoctorSchedule> daySchedules = doctorScheduleRepo.findByDoctorId(doctor.getId()).stream()
                .filter(s -> dayName.equalsIgnoreCase(s.getDayOfWeek()) && s.isAvailable())
                .toList();
        for (DoctorSchedule sch : daySchedules) {
            if (sch.getBreakStart() != null && sch.getBreakEnd() != null) {
                boolean overlapsBreak = request.getStartTime().isBefore(sch.getBreakEnd())
                        && request.getEndTime().isAfter(sch.getBreakStart());
                if (overlapsBreak) {
                    throw new RuntimeException("The new slot overlaps with your scheduled break time (" +
                            sch.getBreakStart() + " - " + sch.getBreakEnd() + ").");
                }
            }
        }

        // Check overlap excluding this appointment itself
        boolean conflict = appointmentRepo.isDoctorSlotBookedExcludingId(
                doctor.getId(),
                request.getAppointmentDate(),
                request.getStartTime(),
                request.getEndTime(),
                appointment.getId()
        );
        if (conflict) {
            throw new RuntimeException("You already have another appointment booked during " +
                    request.getStartTime() + " - " + request.getEndTime() + " on " + request.getAppointmentDate() + ".");
        }

        appointment.setRescheduledFromDate(appointment.getAppointmentDate());
        appointment.setRescheduledFromStart(appointment.getStartTime());
        appointment.setRescheduledFromEnd(appointment.getEndTime());

        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getEndTime());
        if (appointment.getStatus() == AppointmentStatus.PENDING) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);
        }

        appointment = appointmentRepo.save(appointment);

        logDoctorAudit(doctor, "DOCTOR_RESCHEDULED_APPOINTMENT", "APPOINTMENT", appointment.getId(),
                "Rescheduled appointment #" + appointment.getId() + " to " +
                        request.getAppointmentDate() + " " + request.getStartTime() + "-" + request.getEndTime());

        String noteSuffix = (request.getReason() != null && !request.getReason().trim().isEmpty())
                ? " Note: " + request.getReason().trim()
                : "";
        notificationService.notifyUser(
                appointment.getPatientUser(),
                NotificationType.APPOINTMENT_RESCHEDULED,
                "Appointment Rescheduled",
                doctor.getName() + " rescheduled your appointment to " + request.getAppointmentDate() +
                        " from " + request.getStartTime() + " to " + request.getEndTime() + "." + noteSuffix,
                appointment.getId(),
                "APPOINTMENT",
                "/appointments"
        );

        try {
            emailService.sendPatientStatusUpdate(appointment);
        } catch (Exception e) {
            log.error("Failed to send reschedule email: {}", e.getMessage());
        }

        return mapAppointment(appointment);
    }

    // -------------------------------------------------------------------------
    // 4. PATIENT MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public List<DoctorPatientSummaryResponse> getMyPatients(Doctor doctor, String search) {
        List<User> patients = appointmentRepo.findAuthorizedPatientsForDoctor(doctor.getId());
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;
        LocalDate today = LocalDate.now();

        return patients.stream()
                .map(patient -> {
                    Optional<PatientMedicalProfile> profileOpt = patientMedicalProfileRepo.findByUserId(patient.getId());
                    List<Appointment> apptsWithMe = appointmentRepo
                            .findByDoctorIdAndPatientUserIdOrderByAppointmentDateDescStartTimeDesc(doctor.getId(), patient.getId());

                    long totalVisits = apptsWithMe.stream()
                            .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED || a.getStatus() == AppointmentStatus.CONFIRMED)
                            .count();

                    LocalDate lastVisit = apptsWithMe.stream()
                            .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED || a.getAppointmentDate().isBefore(today))
                            .map(Appointment::getAppointmentDate)
                            .max(LocalDate::compareTo)
                            .orElse(null);

                    LocalDate nextAppt = apptsWithMe.stream()
                            .filter(a -> !a.getAppointmentDate().isBefore(today)
                                    && (a.getStatus() == AppointmentStatus.CONFIRMED || a.getStatus() == AppointmentStatus.PENDING))
                            .map(Appointment::getAppointmentDate)
                            .min(LocalDate::compareTo)
                            .orElse(null);

                    List<MedicalRecord> records = medicalRecordRepo.findByPatientUserIdOrderByCreatedAtDesc(patient.getId());
                    String latestDiagnosis = records.isEmpty() ? null : records.get(0).getDiagnosis();

                    return DoctorPatientSummaryResponse.builder()
                            .patientUserId(patient.getId())
                            .patientCode(formatPatientCode(patient.getId()))
                            .name(patient.getName())
                            .email(patient.getEmail())
                            .phone(patient.getPhone())
                            .profileImage(patient.getProfileImage())
                            .gender(profileOpt.map(PatientMedicalProfile::getGender).orElse(null))
                            .dateOfBirth(profileOpt.map(PatientMedicalProfile::getDateOfBirth).orElse(null))
                            .bloodType(profileOpt.map(PatientMedicalProfile::getBloodType).orElse(null))
                            .allergies(profileOpt.map(PatientMedicalProfile::getAllergies).orElse(null))
                            .chronicConditions(profileOpt.map(PatientMedicalProfile::getChronicConditions).orElse(null))
                            .totalVisitsWithMe(totalVisits)
                            .lastVisitDate(lastVisit)
                            .nextAppointmentDate(nextAppt)
                            .latestDiagnosis(latestDiagnosis)
                            .build();
                })
                .filter(summary -> {
                    if (cleanSearch == null) return true;
                    return (summary.getName() != null && summary.getName().toLowerCase().contains(cleanSearch))
                            || (summary.getEmail() != null && summary.getEmail().toLowerCase().contains(cleanSearch))
                            || (summary.getPhone() != null && summary.getPhone().toLowerCase().contains(cleanSearch))
                            || (summary.getPatientCode() != null && summary.getPatientCode().toLowerCase().contains(cleanSearch))
                            || String.valueOf(summary.getPatientUserId()).equals(cleanSearch.replace("#", ""));
                })
                .sorted(Comparator.comparing(DoctorPatientSummaryResponse::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    @Override
    public DoctorPatientDetailResponse getMyPatientDetail(Doctor doctor, Long patientUserId) {
        requireAuthorizedPatient(doctor, patientUserId);
        User patient = userRepo.findById(patientUserId)
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + patientUserId));

        PatientMedicalProfileResponse medicalProfile = patientMedicalProfileRepo.findByUserId(patientUserId)
                .map(this::mapMedicalProfile)
                .orElse(PatientMedicalProfileResponse.builder()
                        .userId(patientUserId)
                        .build());

        List<AppointmentResponse> appointments = appointmentRepo
                .findByDoctorIdAndPatientUserIdOrderByAppointmentDateDescStartTimeDesc(doctor.getId(), patientUserId)
                .stream()
                .map(this::mapAppointment)
                .collect(Collectors.toList());

        List<MedicalRecordResponse> medicalRecords = medicalRecordRepo
                .findByPatientUserIdOrderByCreatedAtDesc(patientUserId)
                .stream()
                .map(r -> mapMedicalRecord(r, doctor))
                .collect(Collectors.toList());

        List<PrescriptionResponse> prescriptions = prescriptionRepo
                .findByPatientUserIdOrderByCreatedAtDesc(patientUserId)
                .stream()
                .map(p -> mapPrescription(p, doctor))
                .collect(Collectors.toList());

        return DoctorPatientDetailResponse.builder()
                .patientUserId(patient.getId())
                .patientCode(formatPatientCode(patient.getId()))
                .name(patient.getName())
                .email(patient.getEmail())
                .phone(patient.getPhone())
                .profileImage(patient.getProfileImage())
                .medicalProfile(medicalProfile)
                .appointments(appointments)
                .medicalRecords(medicalRecords)
                .prescriptions(prescriptions)
                .build();
    }

    @Override
    @Transactional
    public PatientMedicalProfileResponse updatePatientMedicalProfile(
            Doctor doctor,
            Long patientUserId,
            PatientMedicalProfileRequest request
    ) {
        requireAuthorizedPatient(doctor, patientUserId);
        User patient = userRepo.findById(patientUserId)
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + patientUserId));

        PatientMedicalProfile profile = patientMedicalProfileRepo.findByUserId(patientUserId)
                .orElseGet(() -> PatientMedicalProfile.builder()
                        .user(patient)
                        .build());

        profile.setGender(request.getGender());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setBloodType(request.getBloodType());
        profile.setAllergies(request.getAllergies());
        profile.setChronicConditions(request.getChronicConditions());
        profile.setEmergencyContactName(request.getEmergencyContactName());
        profile.setEmergencyContactPhone(request.getEmergencyContactPhone());
        profile.setUpdatedByDoctor(doctor);

        profile = patientMedicalProfileRepo.save(profile);

        logDoctorAudit(doctor, "UPDATED_PATIENT_MEDICAL_PROFILE", "PATIENT", patientUserId,
                "Updated allergies/conditions for patient " + patient.getName() + " (" + formatPatientCode(patientUserId) + ")");

        return mapMedicalProfile(profile);
    }

    // -------------------------------------------------------------------------
    // 5. MEDICAL RECORDS MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public List<MedicalRecordResponse> getMedicalRecords(Doctor doctor, Long patientUserId, String search) {
        List<MedicalRecord> records;
        if (patientUserId != null) {
            requireAuthorizedPatient(doctor, patientUserId);
            records = medicalRecordRepo.findByPatientUserIdOrderByCreatedAtDesc(patientUserId);
        } else {
            records = medicalRecordRepo.findByDoctorIdOrderByCreatedAtDesc(doctor.getId());
        }

        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;
        return records.stream()
                .filter(r -> {
                    if (cleanSearch == null) return true;
                    String pName = r.getPatientUser().getName() != null ? r.getPatientUser().getName().toLowerCase() : "";
                    String diag = r.getDiagnosis() != null ? r.getDiagnosis().toLowerCase() : "";
                    String symp = r.getSymptoms() != null ? r.getSymptoms().toLowerCase() : "";
                    String code = formatPatientCode(r.getPatientUser().getId()).toLowerCase();
                    return pName.contains(cleanSearch) || diag.contains(cleanSearch) || symp.contains(cleanSearch) || code.contains(cleanSearch);
                })
                .map(r -> mapMedicalRecord(r, doctor))
                .collect(Collectors.toList());
    }

    @Override
    public MedicalRecordResponse getMedicalRecordById(Doctor doctor, Long recordId) {
        MedicalRecord record = medicalRecordRepo.findById(recordId)
                .orElseThrow(() -> new NotFound("Medical record not found with ID: " + recordId));
        if (!record.getDoctor().getId().equals(doctor.getId())) {
            requireAuthorizedPatient(doctor, record.getPatientUser().getId());
        }
        return mapMedicalRecord(record, doctor);
    }

    @Override
    @Transactional
    public MedicalRecordResponse createMedicalRecord(Doctor doctor, CreateMedicalRecordRequest request) {
        requireAuthorizedPatient(doctor, request.getPatientUserId());
        User patient = userRepo.findById(request.getPatientUserId())
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + request.getPatientUserId()));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = requireOwnedAppointment(doctor, request.getAppointmentId());
            if (!appointment.getPatientUser().getId().equals(patient.getId())) {
                throw new RuntimeException("The selected appointment does not belong to the specified patient.");
            }
            if (medicalRecordRepo.existsByAppointmentId(appointment.getId())) {
                throw new RuntimeException("A clinical record already exists for appointment #" + appointment.getId() +
                        ". Please amend the existing record instead.");
            }
        }

        MedicalRecord record = MedicalRecord.builder()
                .patientUser(patient)
                .doctor(doctor)
                .appointment(appointment)
                .symptoms(request.getSymptoms())
                .bloodPressureSystolic(request.getBloodPressureSystolic())
                .bloodPressureDiastolic(request.getBloodPressureDiastolic())
                .heartRate(request.getHeartRate())
                .temperatureC(request.getTemperatureC())
                .respiratoryRate(request.getRespiratoryRate())
                .oxygenSaturation(request.getOxygenSaturation())
                .diagnosis(request.getDiagnosis().trim())
                .treatmentPlan(request.getTreatmentPlan())
                .clinicalNotes(request.getClinicalNotes())
                .followUpRecommendation(request.getFollowUpRecommendation())
                .followUpDate(request.getFollowUpDate())
                .version(1)
                .build();

        record = medicalRecordRepo.save(record);

        logDoctorAudit(doctor, "CREATED_MEDICAL_RECORD", "MEDICAL_RECORD", record.getId(),
                "Created clinical record #" + record.getId() + " for patient " + patient.getName());

        notificationService.notifyUser(
                patient,
                NotificationType.MEDICAL_RECORD_UPDATED,
                "New Clinical Record Added",
                doctor.getName() + " recorded a clinical assessment and diagnosis (" + record.getDiagnosis() + ").",
                record.getId(),
                "MEDICAL_RECORD",
                "/appointments"
        );

        return mapMedicalRecord(record, doctor);
    }

    @Override
    @Transactional
    public MedicalRecordResponse amendMedicalRecord(Doctor doctor, Long recordId, AmendMedicalRecordRequest request) {
        MedicalRecord record = medicalRecordRepo.findById(recordId)
                .orElseThrow(() -> new NotFound("Medical record not found with ID: " + recordId));

        if (!record.getDoctor().getId().equals(doctor.getId())) {
            throw new Forbidden("You can only amend clinical records that you authored.");
        }

        // Preserve immutable snapshot of the previous clinical state before applying amendment
        MedicalRecordRevision snapshot = MedicalRecordRevision.builder()
                .medicalRecord(record)
                .version(record.getVersion())
                .symptoms(record.getSymptoms())
                .bloodPressureSystolic(record.getBloodPressureSystolic())
                .bloodPressureDiastolic(record.getBloodPressureDiastolic())
                .heartRate(record.getHeartRate())
                .temperatureC(record.getTemperatureC())
                .respiratoryRate(record.getRespiratoryRate())
                .oxygenSaturation(record.getOxygenSaturation())
                .diagnosis(record.getDiagnosis())
                .treatmentPlan(record.getTreatmentPlan())
                .clinicalNotes(record.getClinicalNotes())
                .followUpRecommendation(record.getFollowUpRecommendation())
                .followUpDate(record.getFollowUpDate())
                .amendedByDoctor(doctor)
                .amendmentReason(request.getAmendmentReason().trim())
                .build();
        medicalRecordRevisionRepo.save(snapshot);

        record.setSymptoms(request.getSymptoms());
        record.setBloodPressureSystolic(request.getBloodPressureSystolic());
        record.setBloodPressureDiastolic(request.getBloodPressureDiastolic());
        record.setHeartRate(request.getHeartRate());
        record.setTemperatureC(request.getTemperatureC());
        record.setRespiratoryRate(request.getRespiratoryRate());
        record.setOxygenSaturation(request.getOxygenSaturation());
        record.setDiagnosis(request.getDiagnosis().trim());
        record.setTreatmentPlan(request.getTreatmentPlan());
        record.setClinicalNotes(request.getClinicalNotes());
        record.setFollowUpRecommendation(request.getFollowUpRecommendation());
        record.setFollowUpDate(request.getFollowUpDate());
        record.setVersion(record.getVersion() + 1);

        record = medicalRecordRepo.save(record);

        logDoctorAudit(doctor, "AMENDED_MEDICAL_RECORD", "MEDICAL_RECORD", record.getId(),
                "Amended clinical record #" + record.getId() + " to v" + record.getVersion() +
                        " (Reason: " + request.getAmendmentReason().trim() + ")");

        return mapMedicalRecord(record, doctor);
    }

    // -------------------------------------------------------------------------
    // 6. PRESCRIPTION MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public List<PrescriptionResponse> getPrescriptions(Doctor doctor, Long patientUserId, String search) {
        List<Prescription> prescriptions;
        if (patientUserId != null) {
            requireAuthorizedPatient(doctor, patientUserId);
            prescriptions = prescriptionRepo.findByPatientUserIdOrderByCreatedAtDesc(patientUserId);
        } else {
            prescriptions = prescriptionRepo.findByDoctorIdOrderByCreatedAtDesc(doctor.getId());
        }

        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;
        return prescriptions.stream()
                .filter(p -> {
                    if (cleanSearch == null) return true;
                    String pName = p.getPatientUser().getName() != null ? p.getPatientUser().getName().toLowerCase() : "";
                    String diag = p.getDiagnosisSummary() != null ? p.getDiagnosisSummary().toLowerCase() : "";
                    String rxNum = formatPrescriptionNumber(p.getId()).toLowerCase();
                    boolean medMatch = p.getItems().stream()
                            .anyMatch(i -> i.getMedicationName() != null && i.getMedicationName().toLowerCase().contains(cleanSearch));
                    return pName.contains(cleanSearch) || diag.contains(cleanSearch) || rxNum.contains(cleanSearch) || medMatch;
                })
                .map(p -> mapPrescription(p, doctor))
                .collect(Collectors.toList());
    }

    @Override
    public PrescriptionResponse getPrescriptionById(Doctor doctor, Long prescriptionId) {
        Prescription prescription = prescriptionRepo.findById(prescriptionId)
                .orElseThrow(() -> new NotFound("Prescription not found with ID: " + prescriptionId));
        if (!prescription.getDoctor().getId().equals(doctor.getId())) {
            requireAuthorizedPatient(doctor, prescription.getPatientUser().getId());
        }
        return mapPrescription(prescription, doctor);
    }

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(Doctor doctor, CreatePrescriptionRequest request) {
        requireAuthorizedPatient(doctor, request.getPatientUserId());
        User patient = userRepo.findById(request.getPatientUserId())
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + request.getPatientUserId()));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = requireOwnedAppointment(doctor, request.getAppointmentId());
            if (!appointment.getPatientUser().getId().equals(patient.getId())) {
                throw new RuntimeException("The selected appointment does not belong to the specified patient.");
            }
        }

        MedicalRecord medicalRecord = null;
        if (request.getMedicalRecordId() != null) {
            medicalRecord = medicalRecordRepo.findById(request.getMedicalRecordId())
                    .orElseThrow(() -> new NotFound("Medical record not found with ID: " + request.getMedicalRecordId()));
            if (!medicalRecord.getPatientUser().getId().equals(patient.getId())) {
                throw new RuntimeException("The selected medical record does not belong to the specified patient.");
            }
        }

        Prescription prescription = Prescription.builder()
                .patientUser(patient)
                .doctor(doctor)
                .appointment(appointment)
                .medicalRecord(medicalRecord)
                .diagnosisSummary(request.getDiagnosisSummary())
                .notes(request.getNotes())
                .status(PrescriptionStatus.ACTIVE)
                .items(new ArrayList<>())
                .build();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medicationName(itemReq.getMedicationName().trim())
                    .dosage(itemReq.getDosage().trim())
                    .frequency(itemReq.getFrequency().trim())
                    .duration(itemReq.getDuration().trim())
                    .quantity(itemReq.getQuantity().trim())
                    .instructions(itemReq.getInstructions())
                    .build();
            prescription.getItems().add(item);
        }

        prescription = prescriptionRepo.save(prescription);

        logDoctorAudit(doctor, "ISSUED_PRESCRIPTION", "PRESCRIPTION", prescription.getId(),
                "Issued prescription " + formatPrescriptionNumber(prescription.getId()) +
                        " (" + prescription.getItems().size() + " medications) for " + patient.getName());

        notificationService.notifyUser(
                patient,
                NotificationType.PRESCRIPTION_ISSUED,
                "New Prescription Issued",
                doctor.getName() + " issued prescription " + formatPrescriptionNumber(prescription.getId()) +
                        " with " + prescription.getItems().size() + " medication(s).",
                prescription.getId(),
                "PRESCRIPTION",
                "/appointments"
        );

        return mapPrescription(prescription, doctor);
    }

    @Override
    @Transactional
    public PrescriptionResponse cancelPrescription(
            Doctor doctor,
            Long prescriptionId,
            CancelPrescriptionRequest request
    ) {
        Prescription prescription = prescriptionRepo.findById(prescriptionId)
                .orElseThrow(() -> new NotFound("Prescription not found with ID: " + prescriptionId));

        if (!prescription.getDoctor().getId().equals(doctor.getId())) {
            throw new Forbidden("You can only cancel prescriptions that you issued.");
        }

        if (prescription.getStatus() == PrescriptionStatus.CANCELLED) {
            throw new RuntimeException("Prescription is already cancelled.");
        }

        prescription.setStatus(PrescriptionStatus.CANCELLED);
        prescription.setCancelReason(request.getCancelReason().trim());
        prescription = prescriptionRepo.save(prescription);

        logDoctorAudit(doctor, "CANCELLED_PRESCRIPTION", "PRESCRIPTION", prescription.getId(),
                "Cancelled prescription " + formatPrescriptionNumber(prescription.getId()) +
                        " (Reason: " + request.getCancelReason().trim() + ")");

        return mapPrescription(prescription, doctor);
    }

    // -------------------------------------------------------------------------
    // 7. SCHEDULE MANAGEMENT
    // -------------------------------------------------------------------------

    @Override
    public DoctorScheduleCalendarResponse getScheduleCalendar(Doctor doctor, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().minusDays(7);
        LocalDate end = to != null ? to : LocalDate.now().plusDays(45);

        Doctor freshDoctor = doctorRepo.findById(doctor.getId())
                .orElseThrow(() -> new NotFound("Doctor not found"));

        List<DoctorScheduleDto> weeklySchedules = doctorScheduleRepo.findByDoctorId(doctor.getId()).stream()
                .map(sch -> DoctorScheduleDto.builder()
                        .id(sch.getId())
                        .dayOfWeek(sch.getDayOfWeek())
                        .startTime(sch.getStartTime())
                        .endTime(sch.getEndTime())
                        .breakStart(sch.getBreakStart())
                        .breakEnd(sch.getBreakEnd())
                        .isAvailable(sch.isAvailable())
                        .build())
                .collect(Collectors.toList());

        List<UnavailableDateResponse> unavailableDates = doctorUnavailableDateRepo
                .findByDoctorIdOrderByUnavailableDateAsc(doctor.getId())
                .stream()
                .map(u -> UnavailableDateResponse.builder()
                        .id(u.getId())
                        .doctorId(doctor.getId())
                        .unavailableDate(u.getUnavailableDate())
                        .reason(u.getReason())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<AppointmentResponse> appointments = appointmentRepo
                .findByDoctorIdAndAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(doctor.getId(), start, end)
                .stream()
                .map(this::mapAppointment)
                .collect(Collectors.toList());

        return DoctorScheduleCalendarResponse.builder()
                .appointmentDurationMinutes(freshDoctor.getAppointmentDurationMinutes() != null
                        ? freshDoctor.getAppointmentDurationMinutes() : 30)
                .weeklySchedules(weeklySchedules)
                .unavailableDates(unavailableDates)
                .appointments(appointments)
                .build();
    }

    @Override
    @Transactional
    public DoctorScheduleCalendarResponse updateWeeklySchedule(Doctor doctor, DoctorScheduleUpdateRequest request) {
        Doctor managed = doctorRepo.findById(doctor.getId())
                .orElseThrow(() -> new NotFound("Doctor not found"));

        if (request.getAppointmentDurationMinutes() != null) {
            managed.setAppointmentDurationMinutes(request.getAppointmentDurationMinutes());
            doctorRepo.save(managed);
        }

        // Validate each schedule slot
        for (DoctorScheduleDto dto : request.getSchedules()) {
            if (!dto.getStartTime().isBefore(dto.getEndTime())) {
                throw new RuntimeException("Working hours start time must be before end time for " + dto.getDayOfWeek());
            }
            if ((dto.getBreakStart() != null && dto.getBreakEnd() == null)
                    || (dto.getBreakStart() == null && dto.getBreakEnd() != null)) {
                throw new RuntimeException("Both break start and break end must be provided for " + dto.getDayOfWeek());
            }
            if (dto.getBreakStart() != null && dto.getBreakEnd() != null) {
                if (!dto.getBreakStart().isBefore(dto.getBreakEnd())) {
                    throw new RuntimeException("Break start time must be before break end time for " + dto.getDayOfWeek());
                }
                if (dto.getBreakStart().isBefore(dto.getStartTime()) || dto.getBreakEnd().isAfter(dto.getEndTime())) {
                    throw new RuntimeException("Break time must fall within working hours for " + dto.getDayOfWeek());
                }
            }
        }

        doctorScheduleRepo.deleteByDoctorId(managed.getId());
        List<DoctorSchedule> saved = request.getSchedules().stream()
                .map(dto -> DoctorSchedule.builder()
                        .doctor(managed)
                        .dayOfWeek(dto.getDayOfWeek().toUpperCase())
                        .startTime(dto.getStartTime())
                        .endTime(dto.getEndTime())
                        .breakStart(dto.getBreakStart())
                        .breakEnd(dto.getBreakEnd())
                        .isAvailable(dto.getIsAvailable() == null || dto.getIsAvailable())
                        .build())
                .collect(Collectors.toList());
        doctorScheduleRepo.saveAll(saved);

        logDoctorAudit(managed, "DOCTOR_UPDATED_SCHEDULE", "DOCTOR_SCHEDULE", managed.getId(),
                "Updated weekly working hours and break times (" + saved.size() + " day entries)");

        return getScheduleCalendar(managed, null, null);
    }

    @Override
    @Transactional
    public UnavailableDateResponse addUnavailableDate(Doctor doctor, UnavailableDateRequest request) {
        if (request.getUnavailableDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Unavailable date cannot be in the past.");
        }
        if (doctorUnavailableDateRepo.existsByDoctorIdAndUnavailableDate(doctor.getId(), request.getUnavailableDate())) {
            throw new RuntimeException("Date " + request.getUnavailableDate() + " is already marked as unavailable.");
        }

        // Check if there are already CONFIRMED appointments on that date
        List<Appointment> activeOnDate = appointmentRepo
                .findByDoctorIdAndAppointmentDateOrderByStartTimeAsc(doctor.getId(), request.getUnavailableDate())
                .stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                .toList();
        if (!activeOnDate.isEmpty()) {
            throw new RuntimeException("You have " + activeOnDate.size() +
                    " CONFIRMED appointment(s) on " + request.getUnavailableDate() +
                    ". Please reschedule or cancel them before blocking this date.");
        }

        DoctorUnavailableDate entry = DoctorUnavailableDate.builder()
                .doctor(doctor)
                .unavailableDate(request.getUnavailableDate())
                .reason(request.getReason() != null ? request.getReason().trim() : "Personal / Clinical Leave")
                .build();
        entry = doctorUnavailableDateRepo.save(entry);

        logDoctorAudit(doctor, "DOCTOR_BLOCKED_DATE", "DOCTOR_SCHEDULE", entry.getId(),
                "Blocked unavailable date: " + entry.getUnavailableDate() + " (" + entry.getReason() + ")");

        return UnavailableDateResponse.builder()
                .id(entry.getId())
                .doctorId(doctor.getId())
                .unavailableDate(entry.getUnavailableDate())
                .reason(entry.getReason())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public void removeUnavailableDate(Doctor doctor, Long unavailableDateId) {
        DoctorUnavailableDate entry = doctorUnavailableDateRepo.findById(unavailableDateId)
                .orElseThrow(() -> new NotFound("Unavailable date entry not found with ID: " + unavailableDateId));
        if (!entry.getDoctor().getId().equals(doctor.getId())) {
            throw new Forbidden("You cannot modify another doctor's unavailable dates.");
        }
        doctorUnavailableDateRepo.delete(entry);
        logDoctorAudit(doctor, "DOCTOR_UNBLOCKED_DATE", "DOCTOR_SCHEDULE", unavailableDateId,
                "Removed blocked date: " + entry.getUnavailableDate());
    }

    // -------------------------------------------------------------------------
    // HELPERS & MAPPERS
    // -------------------------------------------------------------------------

    private Appointment requireOwnedAppointment(Doctor doctor, Long appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + appointmentId));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new Forbidden("Access denied. You cannot view or modify appointments assigned to another doctor.");
        }
        return appointment;
    }

    private void requireAuthorizedPatient(Doctor doctor, Long patientUserId) {
        boolean authorized = appointmentRepo.isPatientAuthorizedForDoctor(doctor.getId(), patientUserId);
        if (!authorized) {
            throw new Forbidden("Access denied. You are only authorized to access patients assigned to your care.");
        }
    }

    private void logDoctorAudit(Doctor doctor, String action, String targetType, Long targetId, String details) {
        if (doctor.getUser() != null) {
            auditLogService.log(doctor.getUser(), action, targetType, targetId, details);
        }
    }

    private String formatPatientCode(Long userId) {
        return String.format("PT-%05d", userId != null ? userId : 0);
    }

    private String formatPrescriptionNumber(Long id) {
        return String.format("RX-%d-%05d", LocalDate.now().getYear(), id != null ? id : 0);
    }

    private String formatDoctorSpecialties(Doctor doc) {
        if (doc == null || doc.getSpecialties() == null || doc.getSpecialties().isEmpty()) {
            return "General Medicine";
        }
        return doc.getSpecialties().stream()
                .map(Specialty::getName)
                .sorted()
                .collect(Collectors.joining(", "));
    }

    private AppointmentResponse mapAppointment(Appointment appointment) {
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

    private PatientMedicalProfileResponse mapMedicalProfile(PatientMedicalProfile profile) {
        return PatientMedicalProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .gender(profile.getGender())
                .dateOfBirth(profile.getDateOfBirth())
                .bloodType(profile.getBloodType())
                .allergies(profile.getAllergies())
                .chronicConditions(profile.getChronicConditions())
                .emergencyContactName(profile.getEmergencyContactName())
                .emergencyContactPhone(profile.getEmergencyContactPhone())
                .updatedByDoctorName(profile.getUpdatedByDoctor() != null ? profile.getUpdatedByDoctor().getName() : null)
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    private MedicalRecordResponse mapMedicalRecord(MedicalRecord record, Doctor currentDoctor) {
        List<MedicalRecordRevisionResponse> revisions = medicalRecordRevisionRepo
                .findByMedicalRecordIdOrderByVersionDesc(record.getId())
                .stream()
                .map(rev -> MedicalRecordRevisionResponse.builder()
                        .id(rev.getId())
                        .version(rev.getVersion())
                        .symptoms(rev.getSymptoms())
                        .bloodPressureSystolic(rev.getBloodPressureSystolic())
                        .bloodPressureDiastolic(rev.getBloodPressureDiastolic())
                        .heartRate(rev.getHeartRate())
                        .temperatureC(rev.getTemperatureC())
                        .respiratoryRate(rev.getRespiratoryRate())
                        .oxygenSaturation(rev.getOxygenSaturation())
                        .diagnosis(rev.getDiagnosis())
                        .treatmentPlan(rev.getTreatmentPlan())
                        .clinicalNotes(rev.getClinicalNotes())
                        .followUpRecommendation(rev.getFollowUpRecommendation())
                        .followUpDate(rev.getFollowUpDate())
                        .amendedByDoctorId(rev.getAmendedByDoctor().getId())
                        .amendedByDoctorName(rev.getAmendedByDoctor().getName())
                        .amendmentReason(rev.getAmendmentReason())
                        .createdAt(rev.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return MedicalRecordResponse.builder()
                .id(record.getId())
                .patientUserId(record.getPatientUser().getId())
                .patientCode(formatPatientCode(record.getPatientUser().getId()))
                .patientName(record.getPatientUser().getName())
                .patientEmail(record.getPatientUser().getEmail())
                .patientPhone(record.getPatientUser().getPhone())
                .doctorId(record.getDoctor().getId())
                .doctorName(record.getDoctor().getName())
                .doctorSpecialty(formatDoctorSpecialties(record.getDoctor()))
                .appointmentId(record.getAppointment() != null ? record.getAppointment().getId() : null)
                .appointmentDate(record.getAppointment() != null ? record.getAppointment().getAppointmentDate() : null)
                .symptoms(record.getSymptoms())
                .bloodPressureSystolic(record.getBloodPressureSystolic())
                .bloodPressureDiastolic(record.getBloodPressureDiastolic())
                .heartRate(record.getHeartRate())
                .temperatureC(record.getTemperatureC())
                .respiratoryRate(record.getRespiratoryRate())
                .oxygenSaturation(record.getOxygenSaturation())
                .diagnosis(record.getDiagnosis())
                .treatmentPlan(record.getTreatmentPlan())
                .clinicalNotes(record.getClinicalNotes())
                .followUpRecommendation(record.getFollowUpRecommendation())
                .followUpDate(record.getFollowUpDate())
                .version(record.getVersion())
                .isEditableByCurrentDoctor(record.getDoctor().getId().equals(currentDoctor.getId()))
                .revisions(revisions)
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private PrescriptionResponse mapPrescription(Prescription prescription, Doctor currentDoctor) {
        List<PrescriptionItemResponse> items = prescription.getItems().stream()
                .map(i -> PrescriptionItemResponse.builder()
                        .id(i.getId())
                        .medicationName(i.getMedicationName())
                        .dosage(i.getDosage())
                        .frequency(i.getFrequency())
                        .duration(i.getDuration())
                        .quantity(i.getQuantity())
                        .instructions(i.getInstructions())
                        .build())
                .collect(Collectors.toList());

        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .prescriptionNumber(formatPrescriptionNumber(prescription.getId()))
                .patientUserId(prescription.getPatientUser().getId())
                .patientCode(formatPatientCode(prescription.getPatientUser().getId()))
                .patientName(prescription.getPatientUser().getName())
                .patientEmail(prescription.getPatientUser().getEmail())
                .patientPhone(prescription.getPatientUser().getPhone())
                .doctorId(prescription.getDoctor().getId())
                .doctorName(prescription.getDoctor().getName())
                .doctorLicenseNumber(prescription.getDoctor().getLicenseNumber())
                .doctorSpecialty(formatDoctorSpecialties(prescription.getDoctor()))
                .doctorPhone(prescription.getDoctor().getPhone())
                .doctorAddress(prescription.getDoctor().getAddress())
                .appointmentId(prescription.getAppointment() != null ? prescription.getAppointment().getId() : null)
                .appointmentDate(prescription.getAppointment() != null ? prescription.getAppointment().getAppointmentDate() : null)
                .medicalRecordId(prescription.getMedicalRecord() != null ? prescription.getMedicalRecord().getId() : null)
                .diagnosisSummary(prescription.getDiagnosisSummary())
                .notes(prescription.getNotes())
                .status(prescription.getStatus())
                .cancelReason(prescription.getCancelReason())
                .isAuthorCurrentDoctor(prescription.getDoctor().getId().equals(currentDoctor.getId()))
                .items(items)
                .createdAt(prescription.getCreatedAt())
                .updatedAt(prescription.getUpdatedAt())
                .build();
    }
}
