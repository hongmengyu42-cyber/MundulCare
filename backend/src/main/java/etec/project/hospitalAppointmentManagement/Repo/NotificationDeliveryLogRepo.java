package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.NotificationDeliveryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationDeliveryLogRepo extends JpaRepository<NotificationDeliveryLog, Long> {
    Page<NotificationDeliveryLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<NotificationDeliveryLog> findTop50ByOrderByCreatedAtDesc();

    List<NotificationDeliveryLog> findByChannelOrderByCreatedAtDesc(String channel);

    List<NotificationDeliveryLog> findByStatusOrderByCreatedAtDesc(String status);
}
