package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.MedicalRecordRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordRevisionRepo extends JpaRepository<MedicalRecordRevision, Long> {
    List<MedicalRecordRevision> findByMedicalRecordIdOrderByVersionDesc(Long medicalRecordId);
}
