package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepo extends JpaRepository<MedicalRecord, Long> {
    List<MedicalRecord> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<MedicalRecord> findByPatientUserIdOrderByCreatedAtDesc(Long patientUserId);
    List<MedicalRecord> findByDoctorIdAndPatientUserIdOrderByCreatedAtDesc(Long doctorId, Long patientUserId);
    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);
    boolean existsByAppointmentId(Long appointmentId);
}
