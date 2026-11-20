package etec.project.hospitalAppointmentManagement.controller;

import etec.project.hospitalAppointmentManagement.Security.CurrentUserResolver;
import etec.project.hospitalAppointmentManagement.Service.DoctorPortalService;
import etec.project.hospitalAppointmentManagement.dto.request.*;
import etec.project.hospitalAppointmentManagement.dto.response.*;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/doctor-portal")
@RequiredArgsConstructor
@Tag(name = "Doctor Portal", description = "Protected endpoints exclusively for authenticated Doctors")
public class DoctorPortalController {

    private final DoctorPortalService doctorPortalService;
    private final CurrentUserResolver currentUserResolver;

    // -------------------------------------------------------------------------
    // 1. DASHBOARD
    // -------------------------------------------------------------------------

    @GetMapping("/dashboard")
    @Operation(summary = "Get Doctor Dashboard KPIs, statistics, and today's schedule")
    public ResponseEntity<ApiResponse<DoctorDashboardResponse>> getDashboard(Authentication authentication) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Doctor dashboard retrieved successfully",
                doctorPortalService.getDashboard(doctor)
        ));
    }

    // -------------------------------------------------------------------------
    // 2. DOCTOR PROFILE
    // -------------------------------------------------------------------------

    @GetMapping("/profile")
    @Operation(summary = "Get own doctor profile")
    public ResponseEntity<ApiResponse<DoctorResponse>> getOwnProfile(Authentication authentication) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Doctor profile retrieved successfully",
                doctorPortalService.getOwnProfile(doctor)
        ));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update permitted fields on own doctor profile")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateOwnProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateDoctorOwnProfileRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Doctor profile updated successfully",
                doctorPortalService.updateOwnProfile(doctor, request)
        ));
    }

    @PostMapping(value = "/profile/image", consumes = "multipart/form-data")
    @Operation(summary = "Upload/replace own doctor profile photo")
    public ResponseEntity<ApiResponse<String>> uploadOwnProfileImage(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        String url = doctorPortalService.uploadOwnProfileImage(doctor, file);
        return ResponseEntity.ok(ApiResponse.success("Profile photo updated successfully", url));
    }

    @DeleteMapping("/profile/image")
    @Operation(summary = "Remove own doctor profile photo")
    public ResponseEntity<ApiResponse<String>> deleteOwnProfileImage(Authentication authentication) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        doctorPortalService.deleteOwnProfileImage(doctor);
        return ResponseEntity.ok(ApiResponse.success("Profile photo removed successfully"));
    }

    // -------------------------------------------------------------------------
    // 3. APPOINTMENT MANAGEMENT
    // -------------------------------------------------------------------------

    @GetMapping("/appointments")
    @Operation(summary = "List doctor's assigned appointments with optional date/status/search filters")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(required = false) String search
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointments retrieved successfully",
                doctorPortalService.getMyAppointments(doctor, date, from, to, status, search)
        ));
    }

    @GetMapping("/appointments/{id}")
    @Operation(summary = "Get details of an assigned appointment")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getAppointmentDetail(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment retrieved successfully",
                doctorPortalService.getMyAppointmentDetail(doctor, id)
        ));
    }

    @PutMapping("/appointments/{id}/confirm")
    @Operation(summary = "Accept/confirm a pending appointment request")
    public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment confirmed successfully",
                doctorPortalService.confirmAppointment(doctor, id)
        ));
    }

    @PutMapping("/appointments/{id}/reject")
    @Operation(summary = "Reject a pending appointment request with a reason")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rejectAppointment(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody DoctorAppointmentActionRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment rejected",
                doctorPortalService.rejectAppointment(doctor, id, request)
        ));
    }

    @PutMapping("/appointments/{id}/cancel")
    @Operation(summary = "Cancel an appointment with a reason")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody DoctorAppointmentActionRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment cancelled",
                doctorPortalService.cancelAppointment(doctor, id, request)
        ));
    }

    @PutMapping("/appointments/{id}/complete")
    @Operation(summary = "Mark a confirmed appointment as completed")
    public ResponseEntity<ApiResponse<AppointmentResponse>> completeAppointment(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment marked as completed",
                doctorPortalService.completeAppointment(doctor, id)
        ));
    }

    @PutMapping("/appointments/{id}/call")
    @Operation(summary = "Call patient queue ticket into consultation room")
    public ResponseEntity<ApiResponse<AppointmentResponse>> callQueue(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) CallQueueRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Patient called into consultation room",
                doctorPortalService.callQueue(doctor, id, request != null ? request.getRoomNumber() : null)
        ));
    }

    @PutMapping("/appointments/{id}/start-consultation")
    @Operation(summary = "Mark consultation actively in progress")
    public ResponseEntity<ApiResponse<AppointmentResponse>> startConsultation(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Consultation started",
                doctorPortalService.startConsultation(doctor, id)
        ));
    }

    @PutMapping("/appointments/{id}/complete-consultation")
    @Operation(summary = "Complete consultation with clinical notes and prescription")
    public ResponseEntity<ApiResponse<AppointmentResponse>> completeConsultation(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody CompleteConsultationRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Consultation completed successfully",
                doctorPortalService.completeConsultation(doctor, id, request)
        ));
    }

    @PutMapping("/appointments/{id}/reschedule")
    @Operation(summary = "Reschedule an appointment to a new date and time slot")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rescheduleAppointment(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody RescheduleAppointmentRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Appointment rescheduled successfully",
                doctorPortalService.rescheduleAppointment(doctor, id, request)
        ));
    }

    // -------------------------------------------------------------------------
    // 4. PATIENT MANAGEMENT
    // -------------------------------------------------------------------------

    @GetMapping("/patients")
    @Operation(summary = "List authorized patients assigned to this doctor")
    public ResponseEntity<ApiResponse<List<DoctorPatientSummaryResponse>>> getMyPatients(
            Authentication authentication,
            @RequestParam(required = false) String search
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Authorized patients retrieved successfully",
                doctorPortalService.getMyPatients(doctor, search)
        ));
    }

    @GetMapping("/patients/{patientUserId}")
    @Operation(summary = "Get full clinical profile, medical history, diagnoses, vitals, and prescriptions for an authorized patient")
    public ResponseEntity<ApiResponse<DoctorPatientDetailResponse>> getPatientDetail(
            Authentication authentication,
            @PathVariable Long patientUserId
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Patient clinical profile retrieved successfully",
                doctorPortalService.getMyPatientDetail(doctor, patientUserId)
        ));
    }

    @PutMapping("/patients/{patientUserId}/medical-profile")
    @Operation(summary = "Update an authorized patient's allergies, chronic conditions, blood type, DOB, and emergency contact")
    public ResponseEntity<ApiResponse<PatientMedicalProfileResponse>> updatePatientMedicalProfile(
            Authentication authentication,
            @PathVariable Long patientUserId,
            @Valid @RequestBody PatientMedicalProfileRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Patient medical profile updated successfully",
                doctorPortalService.updatePatientMedicalProfile(doctor, patientUserId, request)
        ));
    }

    // -------------------------------------------------------------------------
    // 5. MEDICAL RECORDS MANAGEMENT
    // -------------------------------------------------------------------------

    @GetMapping("/medical-records")
    @Operation(summary = "List clinical records authored by this doctor or for a specific authorized patient")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getMedicalRecords(
            Authentication authentication,
            @RequestParam(required = false) Long patientUserId,
            @RequestParam(required = false) String search
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Medical records retrieved successfully",
                doctorPortalService.getMedicalRecords(doctor, patientUserId, search)
        ));
    }

    @GetMapping("/medical-records/{id}")
    @Operation(summary = "Get a clinical record along with its revision history")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getMedicalRecordById(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Medical record retrieved successfully",
                doctorPortalService.getMedicalRecordById(doctor, id)
        ));
    }

    @PostMapping("/medical-records")
    @Operation(summary = "Create a new clinical record for an authorized patient")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> createMedicalRecord(
            Authentication authentication,
            @Valid @RequestBody CreateMedicalRecordRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Clinical record saved successfully",
                doctorPortalService.createMedicalRecord(doctor, request)
        ));
    }

    @PutMapping("/medical-records/{id}")
    @Operation(summary = "Amend an existing clinical record while preserving full revision history")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> amendMedicalRecord(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody AmendMedicalRecordRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Clinical record amended with audit revision saved",
                doctorPortalService.amendMedicalRecord(doctor, id, request)
        ));
    }

    // -------------------------------------------------------------------------
    // 6. PRESCRIPTION MANAGEMENT
    // -------------------------------------------------------------------------

    @GetMapping("/prescriptions")
    @Operation(summary = "List prescriptions issued by this doctor or for an authorized patient")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPrescriptions(
            Authentication authentication,
            @RequestParam(required = false) Long patientUserId,
            @RequestParam(required = false) String search
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Prescriptions retrieved successfully",
                doctorPortalService.getPrescriptions(doctor, patientUserId, search)
        ));
    }

    @GetMapping("/prescriptions/{id}")
    @Operation(summary = "Get prescription details by ID")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> getPrescriptionById(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Prescription retrieved successfully",
                doctorPortalService.getPrescriptionById(doctor, id)
        ));
    }

    @PostMapping("/prescriptions")
    @Operation(summary = "Issue a new multi-medication prescription for an authorized patient")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            Authentication authentication,
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Prescription issued successfully",
                doctorPortalService.createPrescription(doctor, request)
        ));
    }

    @PutMapping("/prescriptions/{id}/cancel")
    @Operation(summary = "Cancel a prescription with a reason")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> cancelPrescription(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody CancelPrescriptionRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Prescription cancelled",
                doctorPortalService.cancelPrescription(doctor, id, request)
        ));
    }

    // -------------------------------------------------------------------------
    // 7. SCHEDULE MANAGEMENT
    // -------------------------------------------------------------------------

    @GetMapping("/schedule")
    @Operation(summary = "Get weekly schedule, slot duration, blocked dates, and appointments calendar")
    public ResponseEntity<ApiResponse<DoctorScheduleCalendarResponse>> getScheduleCalendar(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Schedule retrieved successfully",
                doctorPortalService.getScheduleCalendar(doctor, from, to)
        ));
    }

    @PutMapping("/schedule")
    @Operation(summary = "Update working days, working hours, break times, and appointment duration")
    public ResponseEntity<ApiResponse<DoctorScheduleCalendarResponse>> updateWeeklySchedule(
            Authentication authentication,
            @Valid @RequestBody DoctorScheduleUpdateRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Weekly schedule updated successfully",
                doctorPortalService.updateWeeklySchedule(doctor, request)
        ));
    }

    @PostMapping("/schedule/unavailable-dates")
    @Operation(summary = "Block an unavailable date")
    public ResponseEntity<ApiResponse<UnavailableDateResponse>> addUnavailableDate(
            Authentication authentication,
            @Valid @RequestBody UnavailableDateRequest request
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Unavailable date added",
                doctorPortalService.addUnavailableDate(doctor, request)
        ));
    }

    @DeleteMapping("/schedule/unavailable-dates/{id}")
    @Operation(summary = "Remove a blocked unavailable date")
    public ResponseEntity<ApiResponse<String>> removeUnavailableDate(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Doctor doctor = currentUserResolver.requireDoctor(authentication);
        doctorPortalService.removeUnavailableDate(doctor, id);
        return ResponseEntity.ok(ApiResponse.success("Unavailable date removed"));
    }
}
