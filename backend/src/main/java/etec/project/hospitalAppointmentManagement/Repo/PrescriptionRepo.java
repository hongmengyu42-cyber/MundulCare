package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepo extends JpaRepository<Prescription, Long> {
    List<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<Prescription> findByPatientUserIdOrderByCreatedAtDesc(Long patientUserId);
    List<Prescription> findByDoctorIdAndPatientUserIdOrderByCreatedAtDesc(Long doctorId, Long patientUserId);
}
