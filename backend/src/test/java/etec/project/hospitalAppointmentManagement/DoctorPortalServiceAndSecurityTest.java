package etec.project.hospitalAppointmentManagement;

import etec.project.hospitalAppointmentManagement.Repo.*;
import etec.project.hospitalAppointmentManagement.Security.CurrentUserResolver;
import etec.project.hospitalAppointmentManagement.Service.*;
import etec.project.hospitalAppointmentManagement.Service.impl.AppointmentServiceImpl;
import etec.project.hospitalAppointmentManagement.Service.impl.DoctorPortalServiceImpl;
import etec.project.hospitalAppointmentManagement.dto.request.*;
import etec.project.hospitalAppointmentManagement.dto.response.*;
import etec.project.hospitalAppointmentManagement.entity.*;
import etec.project.hospitalAppointmentManagement.enums.*;
import etec.project.hospitalAppointmentManagement.exception.Forbidden;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorPortalServiceAndSecurityTest {

    @Mock private DoctorRepo doctorRepo;
    @Mock private DoctorScheduleRepo doctorScheduleRepo;
    @Mock private DoctorUnavailableDateRepo doctorUnavailableDateRepo;
    @Mock private AppointmentRepo appointmentRepo;
    @Mock private UserRepo userRepo;
    @Mock private PatientMedicalProfileRepo patientMedicalProfileRepo;
    @Mock private MedicalRecordRepo medicalRecordRepo;
    @Mock private MedicalRecordRevisionRepo medicalRecordRevisionRepo;
    @Mock private PrescriptionRepo prescriptionRepo;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private DoctorService doctorService;

    @InjectMocks
    private DoctorPortalServiceImpl doctorPortalService;

    @InjectMocks
    private AppointmentServiceImpl appointmentService;

    private CurrentUserResolver currentUserResolver;

    private User doctorUserA;
    private Doctor doctorA;
    private Doctor doctorB;
    private User patientUser;
    private Appointment appointmentOfDoctorA;
    private Appointment appointmentOfDoctorB;

    @BeforeEach
    void setUp() {
        currentUserResolver = new CurrentUserResolver(userRepo, doctorRepo);

        doctorUserA = User.builder()
                .id(10L)
                .name("Dr. Sothea Chan")
                .email("sotheachan@mundulcare.com")
                .role(Role.DOCTOR)
                .isVerified(true)
                .build();

        doctorA = Doctor.builder()
                .id(1L)
                .user(doctorUserA)
                .name("Dr. Sothea Chan")
                .email("sotheachan@mundulcare.com")
                .licenseNumber("MD-KH-001")
                .consultationFee(25.0)
                .experienceYears(14)
                .isActive(true)
                .specialties(Set.of(Specialty.builder().id(1L).name("General Medicine").build()))
                .build();

        doctorB = Doctor.builder()
                .id(2L)
                .name("Dr. Sovannara Kim")
                .email("sovannara@mundulcare.com")
                .licenseNumber("MD-KH-002")
                .consultationFee(35.0)
                .isActive(true)
                .build();

        patientUser = User.builder()
                .id(100L)
                .name("Sokha Meas")
                .email("sokha@example.com")
                .phone("+855 12 999 000")
                .role(Role.PATIENT)
                .isVerified(true)
                .build();

        appointmentOfDoctorA = Appointment.builder()
                .id(501L)
                .doctor(doctorA)
                .patientUser(patientUser)
                .patientName(patientUser.getName())
                .patientEmail(patientUser.getEmail())
                .appointmentDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(9, 30))
                .reason("Persistent fever and cough")
                .status(AppointmentStatus.PENDING)
                .build();

        appointmentOfDoctorB = Appointment.builder()
                .id(502L)
                .doctor(doctorB)
                .patientUser(patientUser)
                .patientName(patientUser.getName())
                .patientEmail(patientUser.getEmail())
                .appointmentDate(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .reason("Chest tightness")
                .status(AppointmentStatus.PENDING)
                .build();
    }

    @Test
    void currentUserResolver_rejectsPatientAccessingDoctorPortal() {
        Authentication auth = new UsernamePasswordAuthenticationToken(patientUser.getEmail(), null);
        when(userRepo.findByEmail(patientUser.getEmail())).thenReturn(Optional.of(patientUser));

        assertThrows(Forbidden.class, () -> currentUserResolver.requireDoctor(auth));
    }

    @Test
    void doctorCannotModifyAnotherDoctorsAppointment() {
        when(appointmentRepo.findById(502L)).thenReturn(Optional.of(appointmentOfDoctorB));

        assertThrows(Forbidden.class, () ->
                doctorPortalService.confirmAppointment(doctorA, 502L));
        assertThrows(Forbidden.class, () ->
                doctorPortalService.rejectAppointment(doctorA, 502L, new DoctorAppointmentActionRequest("Busy")));
        assertThrows(Forbidden.class, () ->
                doctorPortalService.cancelAppointment(doctorA, 502L, new DoctorAppointmentActionRequest("Leave")));
        assertThrows(Forbidden.class, () ->
                doctorPortalService.completeAppointment(doctorA, 502L));
    }

    @Test
    void doctorCannotAccessUnauthorizedPatient() {
        when(appointmentRepo.isPatientAuthorizedForDoctor(doctorA.getId(), 999L)).thenReturn(false);

        assertThrows(Forbidden.class, () ->
                doctorPortalService.getMyPatientDetail(doctorA, 999L));
        assertThrows(Forbidden.class, () ->
                doctorPortalService.updatePatientMedicalProfile(doctorA, 999L, new PatientMedicalProfileRequest()));
    }

    @Test
    void doctorCanConfirmRescheduleAndCompleteOwnAppointment() {
        when(appointmentRepo.findById(501L)).thenReturn(Optional.of(appointmentOfDoctorA));
        when(appointmentRepo.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(medicalRecordRepo.findByAppointmentId(501L)).thenReturn(Optional.empty());

        // 1. Confirm
        AppointmentResponse confirmed = doctorPortalService.confirmAppointment(doctorA, 501L);
        assertEquals(AppointmentStatus.CONFIRMED, confirmed.getStatus());

        // 2. Reschedule
        LocalDate newDate = LocalDate.now().plusDays(3);
        when(doctorUnavailableDateRepo.existsByDoctorIdAndUnavailableDate(doctorA.getId(), newDate)).thenReturn(false);
        when(doctorScheduleRepo.findByDoctorId(doctorA.getId())).thenReturn(List.of());
        when(appointmentRepo.isDoctorSlotBookedExcludingId(
                eq(doctorA.getId()), eq(newDate), eq(LocalTime.of(14, 0)), eq(LocalTime.of(14, 30)), eq(501L)))
                .thenReturn(false);

        AppointmentResponse rescheduled = doctorPortalService.rescheduleAppointment(
                doctorA,
                501L,
                RescheduleAppointmentRequest.builder()
                        .appointmentDate(newDate)
                        .startTime(LocalTime.of(14, 0))
                        .endTime(LocalTime.of(14, 30))
                        .reason("Moved to afternoon clinic")
                        .build()
        );
        assertEquals(newDate, rescheduled.getAppointmentDate());
        assertNotNull(rescheduled.getRescheduledFromDate());

        // 3. Complete
        AppointmentResponse completed = doctorPortalService.completeAppointment(doctorA, 501L);
        assertEquals(AppointmentStatus.COMPLETED, completed.getStatus());
    }

    @Test
    void medicalRecordAmendmentPreservesRevisionSnapshotAndEnforcesAuthorCheck() {
        MedicalRecord record = MedicalRecord.builder()
                .id(800L)
                .patientUser(patientUser)
                .doctor(doctorA)
                .appointment(appointmentOfDoctorA)
                .symptoms("Fever 38.5C")
                .bloodPressureSystolic(120)
                .bloodPressureDiastolic(80)
                .heartRate(78)
                .temperatureC(38.5)
                .respiratoryRate(18)
                .oxygenSaturation(98)
                .diagnosis("Initial Viral Fever")
                .treatmentPlan("Rest and hydration")
                .version(1)
                .build();

        when(medicalRecordRepo.findById(800L)).thenReturn(Optional.of(record));
        when(medicalRecordRepo.save(any(MedicalRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(medicalRecordRevisionRepo.findByMedicalRecordIdOrderByVersionDesc(800L)).thenReturn(List.of());

        // Another doctor (Doctor B) cannot amend Doctor A's record
        assertThrows(Forbidden.class, () ->
                doctorPortalService.amendMedicalRecord(doctorB, 800L, AmendMedicalRecordRequest.builder()
                        .diagnosis("Tampered")
                        .amendmentReason("Unauthorized")
                        .build()));

        // Authoring doctor (Doctor A) amends record -> snapshot saved & version incremented to 2
        MedicalRecordResponse updated = doctorPortalService.amendMedicalRecord(
                doctorA,
                800L,
                AmendMedicalRecordRequest.builder()
                        .symptoms("Fever resolved, mild cough")
                        .bloodPressureSystolic(118)
                        .bloodPressureDiastolic(76)
                        .heartRate(72)
                        .temperatureC(37.0)
                        .respiratoryRate(16)
                        .oxygenSaturation(99)
                        .diagnosis("Confirmed Influenza A")
                        .treatmentPlan("Oseltamivir 75mg twice daily")
                        .amendmentReason("Rapid antigen test returned positive for Influenza A")
                        .build()
        );

        ArgumentCaptor<MedicalRecordRevision> revCaptor = ArgumentCaptor.forClass(MedicalRecordRevision.class);
        verify(medicalRecordRevisionRepo, times(1)).save(revCaptor.capture());
        assertEquals("Initial Viral Fever", revCaptor.getValue().getDiagnosis());
        assertEquals(1, revCaptor.getValue().getVersion());
        assertEquals(2, updated.getVersion());
        assertEquals("Confirmed Influenza A", updated.getDiagnosis());
    }

    @Test
    void prescriptionCreationAndAuthorOnlyCancellation() {
        when(appointmentRepo.isPatientAuthorizedForDoctor(doctorA.getId(), patientUser.getId())).thenReturn(true);
        when(userRepo.findById(patientUser.getId())).thenReturn(Optional.of(patientUser));
        when(prescriptionRepo.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(900L);
            return p;
        });

        PrescriptionResponse created = doctorPortalService.createPrescription(
                doctorA,
                CreatePrescriptionRequest.builder()
                        .patientUserId(patientUser.getId())
                        .diagnosisSummary("Influenza A")
                        .items(List.of(
                                PrescriptionItemRequest.builder()
                                        .medicationName("Oseltamivir")
                                        .dosage("75mg")
                                        .frequency("Twice daily")
                                        .duration("5 days")
                                        .quantity("10 capsules")
                                        .instructions("Take with food")
                                        .build()
                        ))
                        .build()
        );

        assertEquals(PrescriptionStatus.ACTIVE, created.getStatus());
        assertEquals(1, created.getItems().size());

        Prescription savedEntity = Prescription.builder()
                .id(900L)
                .patientUser(patientUser)
                .doctor(doctorA)
                .status(PrescriptionStatus.ACTIVE)
                .build();
        when(prescriptionRepo.findById(900L)).thenReturn(Optional.of(savedEntity));

        // Doctor B cannot cancel Doctor A's prescription
        assertThrows(Forbidden.class, () ->
                doctorPortalService.cancelPrescription(doctorB, 900L, new CancelPrescriptionRequest("Wrong doctor")));

        // Doctor A can cancel
        PrescriptionResponse cancelled = doctorPortalService.cancelPrescription(
                doctorA, 900L, new CancelPrescriptionRequest("Switched medication")
        );
        assertEquals(PrescriptionStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    void patientBookingRespectsBlockedUnavailableDatesAndBreakTimes() {
        LocalDate blockedDate = LocalDate.now().plusDays(5);
        when(userRepo.findById(patientUser.getId())).thenReturn(Optional.of(patientUser));
        when(doctorRepo.findById(doctorA.getId())).thenReturn(Optional.of(doctorA));
        when(doctorUnavailableDateRepo.existsByDoctorIdAndUnavailableDate(doctorA.getId(), blockedDate))
                .thenReturn(true);

        BookAppointmentRequest blockedReq = new BookAppointmentRequest();
        blockedReq.setDoctorId(doctorA.getId());
        blockedReq.setAppointmentDate(blockedDate);
        blockedReq.setStartTime(LocalTime.of(9, 0));
        blockedReq.setEndTime(LocalTime.of(9, 30));
        blockedReq.setReason("Checkup");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                appointmentService.bookAppointment(patientUser.getId(), blockedReq));
        assertTrue(ex.getMessage().contains("unavailable"));
    }
}
