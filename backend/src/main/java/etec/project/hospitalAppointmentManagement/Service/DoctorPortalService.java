package etec.project.hospitalAppointmentManagement.Service;

import etec.project.hospitalAppointmentManagement.dto.request.*;
import etec.project.hospitalAppointmentManagement.dto.response.*;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.enums.AppointmentStatus;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public interface DoctorPortalService {

    // 1. Dashboard
    DoctorDashboardResponse getDashboard(Doctor doctor);

    // 2. Own Profile
    DoctorResponse getOwnProfile(Doctor doctor);
    DoctorResponse updateOwnProfile(Doctor doctor, UpdateDoctorOwnProfileRequest request);
    String uploadOwnProfileImage(Doctor doctor, MultipartFile file);
    void deleteOwnProfileImage(Doctor doctor);

    // 3. Appointment Management
    List<AppointmentResponse> getMyAppointments(
            Doctor doctor,
            LocalDate date,
            LocalDate from,
            LocalDate to,
            AppointmentStatus status,
            String search
    );
    AppointmentResponse getMyAppointmentDetail(Doctor doctor, Long appointmentId);
    AppointmentResponse confirmAppointment(Doctor doctor, Long appointmentId);
    AppointmentResponse rejectAppointment(Doctor doctor, Long appointmentId, DoctorAppointmentActionRequest request);
    AppointmentResponse cancelAppointment(Doctor doctor, Long appointmentId, DoctorAppointmentActionRequest request);
    AppointmentResponse completeAppointment(Doctor doctor, Long appointmentId);
    AppointmentResponse rescheduleAppointment(Doctor doctor, Long appointmentId, RescheduleAppointmentRequest request);
    AppointmentResponse callQueue(Doctor doctor, Long appointmentId, String roomNumber);
    AppointmentResponse startConsultation(Doctor doctor, Long appointmentId);
    AppointmentResponse completeConsultation(Doctor doctor, Long appointmentId, CompleteConsultationRequest request);

    // 4. Patient Management
    List<DoctorPatientSummaryResponse> getMyPatients(Doctor doctor, String search);
    DoctorPatientDetailResponse getMyPatientDetail(Doctor doctor, Long patientUserId);
    PatientMedicalProfileResponse updatePatientMedicalProfile(
            Doctor doctor,
            Long patientUserId,
            PatientMedicalProfileRequest request
    );

    // 5. Medical Records Management
    List<MedicalRecordResponse> getMedicalRecords(Doctor doctor, Long patientUserId, String search);
    MedicalRecordResponse getMedicalRecordById(Doctor doctor, Long recordId);
    MedicalRecordResponse createMedicalRecord(Doctor doctor, CreateMedicalRecordRequest request);
    MedicalRecordResponse amendMedicalRecord(Doctor doctor, Long recordId, AmendMedicalRecordRequest request);

    // 6. Prescription Management
    List<PrescriptionResponse> getPrescriptions(Doctor doctor, Long patientUserId, String search);
    PrescriptionResponse getPrescriptionById(Doctor doctor, Long prescriptionId);
    PrescriptionResponse createPrescription(Doctor doctor, CreatePrescriptionRequest request);
    PrescriptionResponse cancelPrescription(Doctor doctor, Long prescriptionId, CancelPrescriptionRequest request);

    // 7. Schedule Management
    DoctorScheduleCalendarResponse getScheduleCalendar(Doctor doctor, LocalDate from, LocalDate to);
    DoctorScheduleCalendarResponse updateWeeklySchedule(Doctor doctor, DoctorScheduleUpdateRequest request);
    UnavailableDateResponse addUnavailableDate(Doctor doctor, UnavailableDateRequest request);
    void removeUnavailableDate(Doctor doctor, Long unavailableDateId);
}
