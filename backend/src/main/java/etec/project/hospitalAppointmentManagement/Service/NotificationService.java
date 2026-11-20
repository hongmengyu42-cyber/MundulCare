package etec.project.hospitalAppointmentManagement.Service;

import etec.project.hospitalAppointmentManagement.dto.response.NotificationResponse;
import etec.project.hospitalAppointmentManagement.entity.Appointment;
import etec.project.hospitalAppointmentManagement.entity.PaymentTransaction;
import etec.project.hospitalAppointmentManagement.entity.User;
import etec.project.hospitalAppointmentManagement.enums.NotificationType;
import etec.project.hospitalAppointmentManagement.enums.Role;

import java.util.List;

public interface NotificationService {

    void notifyUser(
            User recipient,
            NotificationType type,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String link
    );

    void notifyRole(
            Role role,
            NotificationType type,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String link
    );

    void handlePaymentSuccess(PaymentTransaction transaction);

    void handlePatientCheckIn(Appointment appointment);

    List<NotificationResponse> getMyNotifications(Long userId, boolean unreadOnly);

    long getUnreadCount(Long userId);

    NotificationResponse markAsRead(Long userId, Long notificationId);

    void markAllAsRead(Long userId);
}
