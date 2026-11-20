package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.DoctorUnavailableDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DoctorUnavailableDateRepo extends JpaRepository<DoctorUnavailableDate, Long> {
    List<DoctorUnavailableDate> findByDoctorIdOrderByUnavailableDateAsc(Long doctorId);
    List<DoctorUnavailableDate> findByDoctorIdAndUnavailableDateBetweenOrderByUnavailableDateAsc(
            Long doctorId, LocalDate from, LocalDate to
    );
    boolean existsByDoctorIdAndUnavailableDate(Long doctorId, LocalDate unavailableDate);
    void deleteByDoctorId(Long doctorId);
}
