package etec.project.hospitalAppointmentManagement.controller;

import etec.project.hospitalAppointmentManagement.Repo.NotificationDeliveryLogRepo;
import etec.project.hospitalAppointmentManagement.Repo.NotificationSettingRepo;
import etec.project.hospitalAppointmentManagement.Service.TelegramService;
import etec.project.hospitalAppointmentManagement.dto.request.NotificationSettingRequest;
import etec.project.hospitalAppointmentManagement.dto.response.ApiResponse;
import etec.project.hospitalAppointmentManagement.entity.NotificationDeliveryLog;
import etec.project.hospitalAppointmentManagement.entity.NotificationSetting;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Notifications", description = "Notification Settings Dashboard, Telegram Configuration & Delivery Logs")
public class NotificationAdminController {

    private final NotificationSettingRepo settingRepo;
    private final NotificationDeliveryLogRepo logRepo;
    private final TelegramService telegramService;

    @Value("${telegram.bot-token:}")
    private String defaultBotToken;

    @Value("${telegram.finance-chat-id:}")
    private String defaultFinanceChatId;

    @Value("${telegram.operations-chat-id:}")
    private String defaultOperationsChatId;

    @Value("${telegram.admin-chat-id:}")
    private String defaultAdminChatId;

    @Value("${telegram.enabled:false}")
    private boolean defaultEnabled;

    @GetMapping("/settings")
    @Operation(summary = "Get notification settings")
    public ResponseEntity<ApiResponse<NotificationSetting>> getSettings() {
        NotificationSetting setting = settingRepo.findFirstByOrderByIdAsc()
                .orElseGet(() -> NotificationSetting.builder()
                        .telegramBotToken(defaultBotToken)
                        .telegramFinanceChatId(defaultFinanceChatId)
                        .telegramOperationsChatId(defaultOperationsChatId)
                        .telegramAdminChatId(defaultAdminChatId)
                        .telegramEnabled(defaultEnabled)
                        .notifyOnPayment(true)
                        .notifyOnCheckIn(true)
                        .notifyOnAppointmentBooked(true)
                        .notifyOnAppointmentCancelled(true)
                        .build());
        return ResponseEntity.ok(ApiResponse.success("Notification settings retrieved.", setting));
    }

    @PutMapping("/settings")
    @Operation(summary = "Update notification settings")
    public ResponseEntity<ApiResponse<NotificationSetting>> updateSettings(
            Authentication authentication,
            @RequestBody NotificationSettingRequest request
    ) {
        NotificationSetting setting = settingRepo.findFirstByOrderByIdAsc()
                .orElse(new NotificationSetting());

        if (request.getTelegramBotToken() != null) setting.setTelegramBotToken(request.getTelegramBotToken());
        if (request.getTelegramFinanceChatId() != null) setting.setTelegramFinanceChatId(request.getTelegramFinanceChatId());
        if (request.getTelegramOperationsChatId() != null) setting.setTelegramOperationsChatId(request.getTelegramOperationsChatId());
        if (request.getTelegramAdminChatId() != null) setting.setTelegramAdminChatId(request.getTelegramAdminChatId());
        if (request.getTelegramEnabled() != null) setting.setTelegramEnabled(request.getTelegramEnabled());
        if (request.getNotifyOnPayment() != null) setting.setNotifyOnPayment(request.getNotifyOnPayment());
        if (request.getNotifyOnCheckIn() != null) setting.setNotifyOnCheckIn(request.getNotifyOnCheckIn());
        if (request.getNotifyOnAppointmentBooked() != null) setting.setNotifyOnAppointmentBooked(request.getNotifyOnAppointmentBooked());
        if (request.getNotifyOnAppointmentCancelled() != null) setting.setNotifyOnAppointmentCancelled(request.getNotifyOnAppointmentCancelled());

        if (authentication != null) setting.setUpdatedBy(authentication.getName());

        setting = settingRepo.save(setting);
        return ResponseEntity.ok(ApiResponse.success("Notification settings updated successfully.", setting));
    }

    @PostMapping("/test-telegram")
    @Operation(summary = "Test Telegram Bot connection")
    public ResponseEntity<ApiResponse<Boolean>> testTelegram(
            @RequestBody Map<String, String> body
    ) {
        String token = body.get("botToken");
        String chatId = body.get("chatId");

        if (token == null || token.isBlank()) {
            token = settingRepo.findFirstByOrderByIdAsc()
                    .map(NotificationSetting::getTelegramBotToken)
                    .orElse(defaultBotToken);
        }
        if (chatId == null || chatId.isBlank()) {
            chatId = settingRepo.findFirstByOrderByIdAsc()
                    .map(NotificationSetting::getTelegramFinanceChatId)
                    .orElse(defaultFinanceChatId);
        }

        boolean ok = telegramService.testConnection(token, chatId);
        if (ok) {
            return ResponseEntity.ok(ApiResponse.success("Test message dispatched successfully to Telegram!", true));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to deliver test message. Check your bot token and chat ID."));
        }
    }

    @GetMapping("/logs")
    @Operation(summary = "Get notification delivery logs")
    public ResponseEntity<ApiResponse<List<NotificationDeliveryLog>>> getLogs() {
        List<NotificationDeliveryLog> logs = logRepo.findTop50ByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success("Notification delivery logs retrieved.", logs));
    }
}
