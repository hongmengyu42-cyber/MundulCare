package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.HospitalBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalBranchRepo extends JpaRepository<HospitalBranch, Long> {
    Optional<HospitalBranch> findByCode(String code);
    boolean existsByCode(String code);
}
