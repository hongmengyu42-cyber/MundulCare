package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.PatientMedicalProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientMedicalProfileRepo extends JpaRepository<PatientMedicalProfile, Long> {
    Optional<PatientMedicalProfile> findByUserId(Long userId);
}
