package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationSettingRepo extends JpaRepository<NotificationSetting, Long> {
    Optional<NotificationSetting> findFirstByOrderByIdAsc();
}
