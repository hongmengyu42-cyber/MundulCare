package etec.project.hospitalAppointmentManagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "telegram_bot_token", length = 200)
    private String telegramBotToken;

    @Column(name = "telegram_finance_chat_id", length = 80)
    private String telegramFinanceChatId;

    @Column(name = "telegram_operations_chat_id", length = 80)
    private String telegramOperationsChatId;

    @Column(name = "telegram_admin_chat_id", length = 80)
    private String telegramAdminChatId;

    @Column(name = "telegram_enabled", nullable = false)
    @Builder.Default
    private boolean telegramEnabled = false;

    @Column(name = "notify_on_payment", nullable = false)
    @Builder.Default
    private boolean notifyOnPayment = true;

    @Column(name = "notify_on_check_in", nullable = false)
    @Builder.Default
    private boolean notifyOnCheckIn = true;

    @Column(name = "notify_on_appointment_booked", nullable = false)
    @Builder.Default
    private boolean notifyOnAppointmentBooked = true;

    @Column(name = "notify_on_appointment_cancelled", nullable = false)
    @Builder.Default
    private boolean notifyOnAppointmentCancelled = true;

    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
