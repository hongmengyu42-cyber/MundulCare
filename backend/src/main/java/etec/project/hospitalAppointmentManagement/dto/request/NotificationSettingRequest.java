package etec.project.hospitalAppointmentManagement.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingRequest {
    private String telegramBotToken;
    private String telegramFinanceChatId;
    private String telegramOperationsChatId;
    private String telegramAdminChatId;
    private Boolean telegramEnabled;
    private Boolean notifyOnPayment;
    private Boolean notifyOnCheckIn;
    private Boolean notifyOnAppointmentBooked;
    private Boolean notifyOnAppointmentCancelled;
}
