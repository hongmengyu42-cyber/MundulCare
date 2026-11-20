package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.NotificationDeliveryLogRepo;
import etec.project.hospitalAppointmentManagement.Repo.NotificationRepo;
import etec.project.hospitalAppointmentManagement.Repo.UserRepo;
import etec.project.hospitalAppointmentManagement.Service.NotificationService;
import etec.project.hospitalAppointmentManagement.Service.TelegramService;
import etec.project.hospitalAppointmentManagement.dto.response.NotificationResponse;
import etec.project.hospitalAppointmentManagement.entity.*;
import etec.project.hospitalAppointmentManagement.enums.NotificationType;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.Forbidden;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepo notificationRepo;
    private final NotificationDeliveryLogRepo deliveryLogRepo;
    private final UserRepo userRepo;
    private final TelegramService telegramService;

    @Override
    public void notifyUser(
            User recipient,
            NotificationType type,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String link
    ) {
        if (recipient == null) {
            return;
        }
        try {
            Notification notification = Notification.builder()
                    .recipientUser(recipient)
                    .type(type)
                    .title(title)
                    .message(message)
                    .referenceId(referenceId)
                    .referenceType(referenceType)
                    .link(link)
                    .isRead(false)
                    .build();
            notificationRepo.save(notification);

            // Record audit log for in-app delivery
            try {
                deliveryLogRepo.save(NotificationDeliveryLog.builder()
                        .channel("IN_APP")
                        .eventType(type.name())
                        .recipientTarget(recipient.getEmail())
                        .branchName(recipient.getAssignedBranch() != null ? recipient.getAssignedBranch() : "Global")
                        .departmentName("Patient Portal")
                        .title(title)
                        .messagePreview(message)
                        .status("SENT")
                        .build());
            } catch (Exception ignored) {}
        } catch (Exception e) {
            log.error("Failed to create notification for user {}: {}", recipient.getEmail(), e.getMessage());
        }
    }

    @Override
    public void notifyRole(
            Role role,
            NotificationType type,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String link
    ) {
        try {
            List<User> targetUsers = userRepo.findByRoleOrderByCreatedAtDesc(role);
            for (User u : targetUsers) {
                notifyUser(u, type, title, message, referenceId, referenceType, link);
            }
        } catch (Exception e) {
            log.error("Failed to notify role {}: {}", role, e.getMessage());
        }
    }

    @Override
    public void handlePaymentSuccess(PaymentTransaction transaction) {
        if (transaction == null) return;
        Invoice invoice = transaction.getInvoice();
        Appointment appointment = transaction.getAppointment();

        String currencySymbol = "KHR".equalsIgnoreCase(transaction.getCurrency()) ? "៛" : "$";
        String amountStr = String.format("%s%.2f", currencySymbol, transaction.getAmount());

        // 1. In-App Notification to Patient
        if (appointment != null && appointment.getPatientUser() != null) {
            notifyUser(
                    appointment.getPatientUser(),
                    NotificationType.PAYMENT_RECEIVED,
                    "Payment Verified: " + amountStr,
                    "Your consultation fee payment has been confirmed via NBC Bakong. Invoice: " +
                            (invoice != null ? invoice.getInvoiceNumber() : "N/A"),
                    appointment.getId(),
                    "APPOINTMENT",
                    "/my-appointments"
            );
        }

        // 2. In-App Notification to Doctor
        if (appointment != null && appointment.getDoctor() != null && appointment.getDoctor().getUser() != null) {
            notifyUser(
                    appointment.getDoctor().getUser(),
                    NotificationType.PAYMENT_RECEIVED,
                    "Consultation Fee Paid",
                    "Patient " + appointment.getPatientName() + " has completed payment of " + amountStr + " for appointment #" + appointment.getId(),
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/appointments"
            );
        }

        // 3. Centralized Telegram Alert to Finance Department
        if (invoice != null) {
            telegramService.sendFinancePaymentAlert(invoice, transaction);
        }
    }

    @Override
    public void handlePatientCheckIn(Appointment appointment) {
        if (appointment == null) return;

        // 1. Notify Doctor in-app
        if (appointment.getDoctor() != null && appointment.getDoctor().getUser() != null) {
            notifyUser(
                    appointment.getDoctor().getUser(),
                    NotificationType.PATIENT_CHECKED_IN,
                    "Patient Checked In: " + appointment.getQueueNumber(),
                    "Patient " + appointment.getPatientName() + " has arrived and is waiting in the lounge.",
                    appointment.getId(),
                    "APPOINTMENT",
                    "/doctor/dashboard"
            );
        }

        // 2. Centralized Telegram Alert to Front-Desk Operations
        telegramService.sendOperationsCheckInAlert(appointment);
    }

    @Override
    public List<NotificationResponse> getMyNotifications(Long userId, boolean unreadOnly) {
        List<Notification> list = unreadOnly
                ? notificationRepo.findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                : notificationRepo.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public long getUnreadCount(Long userId) {
        return notificationRepo.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepo.findById(notificationId)
                .orElseThrow(() -> new NotFound("Notification not found with ID: " + notificationId));
        if (!notification.getRecipientUser().getId().equals(userId)) {
            throw new Forbidden("You are not authorized to access this notification.");
        }
        notification.setRead(true);
        notification = notificationRepo.save(notification);
        return mapToResponse(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepo.findByRecipientUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepo.saveAll(unread);
    }

    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType())
                .link(n.getLink())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
