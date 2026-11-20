package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.Appointment;
import etec.project.hospitalAppointmentManagement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AppointmentRepo extends JpaRepository<Appointment, Long> {
    // Get all appointments booked by a specific patient (for Patient Dashboard)
    List<Appointment> findByPatientUserIdOrderByAppointmentDateDescStartTimeDesc(Long userId);

    // Get all appointments assigned to a specific doctor
    List<Appointment> findByDoctorIdOrderByAppointmentDateDescStartTimeDesc(Long doctorId);

    List<Appointment> findByDoctorIdAndAppointmentDateOrderByStartTimeAsc(Long doctorId, LocalDate date);

    List<Appointment> findByDoctorIdAndAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(
            Long doctorId, LocalDate from, LocalDate to
    );

    List<Appointment> findByDoctorIdAndPatientUserIdOrderByAppointmentDateDescStartTimeDesc(
            Long doctorId, Long patientUserId
    );

    // Get all appointments across the hospital (for Admin Portal)
    List<Appointment> findAllByOrderByAppointmentDateDescStartTimeDesc();
    // Double-Booking Prevention Query:
    // Returns true if the doctor already has an overlapping active (PENDING or CONFIRMED) appointment
    @Query("SELECT COUNT(a) > 0 FROM Appointment a " +
            "WHERE a.doctor.id = :doctorId " +
            "AND a.appointmentDate = :date " +
            "AND a.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND ((a.startTime <= :startTime AND a.endTime > :startTime) " +
            "     OR (a.startTime < :endTime AND a.endTime >= :endTime) " +
            "     OR (a.startTime >= :startTime AND a.endTime <= :endTime))")
    boolean isDoctorSlotBooked(
            @Param("doctorId") Long doctorId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query("SELECT COUNT(a) > 0 FROM Appointment a " +
            "WHERE a.doctor.id = :doctorId " +
            "AND a.id <> :excludeId " +
            "AND a.appointmentDate = :date " +
            "AND a.status NOT IN ('CANCELLED', 'REJECTED') " +
            "AND ((a.startTime <= :startTime AND a.endTime > :startTime) " +
            "     OR (a.startTime < :endTime AND a.endTime >= :endTime) " +
            "     OR (a.startTime >= :startTime AND a.endTime <= :endTime))")
    boolean isDoctorSlotBookedExcludingId(
            @Param("doctorId") Long doctorId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId
    );

    @Query("SELECT COUNT(a) > 0 FROM Appointment a " +
            "WHERE a.doctor.id = :doctorId " +
            "AND a.patientUser.id = :patientUserId " +
            "AND a.status IN ('PENDING', 'CONFIRMED', 'COMPLETED')")
    boolean isPatientAuthorizedForDoctor(
            @Param("doctorId") Long doctorId,
            @Param("patientUserId") Long patientUserId
    );

    @Query("SELECT DISTINCT a.patientUser FROM Appointment a " +
            "WHERE a.doctor.id = :doctorId " +
            "AND a.status IN ('PENDING', 'CONFIRMED', 'COMPLETED')")
    List<User> findAuthorizedPatientsForDoctor(@Param("doctorId") Long doctorId);

    // Cascade cleanup when a doctor is force-deleted
    void deleteByDoctorId(Long doctorId);

    // Waiting Room Queue Queries
    long countByAppointmentDateAndQueueNumberIsNotNull(LocalDate date);

    List<Appointment> findByAppointmentDateAndQueueStatusIn(LocalDate date, List<String> statuses);

    List<Appointment> findByAppointmentDate(LocalDate date);
}
