package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.NotificationDeliveryLogRepo;
import etec.project.hospitalAppointmentManagement.Repo.NotificationSettingRepo;
import etec.project.hospitalAppointmentManagement.Service.TelegramService;
import etec.project.hospitalAppointmentManagement.entity.Appointment;
import etec.project.hospitalAppointmentManagement.entity.Invoice;
import etec.project.hospitalAppointmentManagement.entity.NotificationDeliveryLog;
import etec.project.hospitalAppointmentManagement.entity.NotificationSetting;
import etec.project.hospitalAppointmentManagement.entity.PaymentTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramServiceImpl implements TelegramService {

    private final NotificationSettingRepo settingRepo;
    private final NotificationDeliveryLogRepo deliveryLogRepo;

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

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private String getEffectiveBotToken() {
        return settingRepo.findFirstByOrderByIdAsc()
                .map(NotificationSetting::getTelegramBotToken)
                .filter(t -> t != null && !t.isBlank())
                .orElse(defaultBotToken);
    }

    private boolean isTelegramEnabled() {
        return settingRepo.findFirstByOrderByIdAsc()
                .map(NotificationSetting::isTelegramEnabled)
                .orElse(defaultEnabled);
    }

    private String getFinanceChatId() {
        return settingRepo.findFirstByOrderByIdAsc()
                .map(NotificationSetting::getTelegramFinanceChatId)
                .filter(c -> c != null && !c.isBlank())
                .orElse(defaultFinanceChatId);
    }

    private String getOperationsChatId() {
        return settingRepo.findFirstByOrderByIdAsc()
                .map(NotificationSetting::getTelegramOperationsChatId)
                .filter(c -> c != null && !c.isBlank())
                .orElse(defaultOperationsChatId);
    }

    private String getAdminChatId() {
        return settingRepo.findFirstByOrderByIdAsc()
                .map(NotificationSetting::getTelegramAdminChatId)
                .filter(c -> c != null && !c.isBlank())
                .orElse(defaultAdminChatId);
    }

    @Override
    public boolean sendFinancePaymentAlert(Invoice invoice, PaymentTransaction transaction) {
        String botToken = getEffectiveBotToken();
        String chatId = getFinanceChatId();

        String maskedPatient = maskPatientName(invoice.getPatientName());
        String maskedPhone = maskPhone(invoice.getPatientPhone());
        String doctorName = invoice.getDoctor() != null && invoice.getDoctor().getUser() != null
                ? invoice.getDoctor().getUser().getName()
                : "Assigned Physician";
        String specialty = invoice.getDoctor() != null && invoice.getDoctor().getSpecialties() != null && !invoice.getDoctor().getSpecialties().isEmpty()
                ? invoice.getDoctor().getSpecialties().iterator().next().getName()
                : "General";

        String hashPreview = transaction.getKhqrMd5Hash() != null && transaction.getKhqrMd5Hash().length() > 8
                ? transaction.getKhqrMd5Hash().substring(0, 8) + "..."
                : (transaction.getTransactionId() != null ? transaction.getTransactionId() : "N/A");

        String timeStr = transaction.getVerifiedAt() != null
                ? transaction.getVerifiedAt().format(FORMATTER)
                : (invoice.getPaidAt() != null ? invoice.getPaidAt().format(FORMATTER) : "Just now");

        String symbol = "KHR".equalsIgnoreCase(invoice.getCurrency()) ? "៛" : "$";
        String amountFormatted = "KHR".equalsIgnoreCase(invoice.getCurrency())
                ? String.format("%,.0f %s", invoice.getTotalAmount(), invoice.getCurrency())
                : String.format("$%.2f %s", invoice.getTotalAmount(), invoice.getCurrency());

        String message = String.format(
                "🏥 <b>MundulCare Finance</b> — <i>Payment Verified</i>\n" +
                "━━━━━━━━━━━━━━━━━━━━━\n" +
                "💰 <b>Amount:</b> <b>%s</b>\n" +
                "🧾 <b>Invoice:</b> <code>%s</code>\n" +
                "💳 <b>Method:</b> Genuine NBC Bakong KHQR\n" +
                "🔗 <b>Tx / Hash:</b> <code>%s</code>\n" +
                "👤 <b>Patient:</b> %s (%s)\n" +
                "🩺 <b>Physician:</b> %s (%s)\n" +
                "📍 <b>Branch:</b> %s\n" +
                "🕒 <b>Verified:</b> %s\n" +
                "━━━━━━━━━━━━━━━━━━━━━\n" +
                "✅ <i>Verified via National Bank of Cambodia (NBC) Bakong API</i>",
                amountFormatted,
                invoice.getInvoiceNumber(),
                hashPreview,
                maskedPatient,
                maskedPhone,
                doctorName,
                specialty,
                invoice.getBranchName() != null ? invoice.getBranchName() : "Main Campus",
                timeStr
        );

        return executeSend(botToken, chatId, "PAYMENT_RECEIVED", "Payment Verified: " + invoice.getInvoiceNumber(), message, invoice.getBranchName(), "Finance");
    }

    @Override
    public boolean sendOperationsCheckInAlert(Appointment appointment) {
        String botToken = getEffectiveBotToken();
        String chatId = getOperationsChatId();

        String maskedPatient = maskPatientName(appointment.getPatientName());
        String doctorName = appointment.getDoctor() != null && appointment.getDoctor().getUser() != null
                ? appointment.getDoctor().getUser().getName()
                : "Doctor";
        String queueNum = appointment.getQueueNumber() != null ? appointment.getQueueNumber() : "N/A";
        String room = appointment.getRoomNumber() != null ? appointment.getRoomNumber() : "Waiting Area";

        String message = String.format(
                "🛎️ <b>MundulCare Reception</b> — <i>Patient Checked-In</i>\n" +
                "━━━━━━━━━━━━━━━━━━━━━\n" +
                "🎟️ <b>Queue Ticket:</b> <b>%s</b>\n" +
                "👤 <b>Patient:</b> %s\n" +
                "🩺 <b>Doctor:</b> %s\n" +
                "🚪 <b>Assigned Room:</b> %s\n" +
                "🕒 <b>Time:</b> %s\n" +
                "━━━━━━━━━━━━━━━━━━━━━",
                queueNum,
                maskedPatient,
                doctorName,
                room,
                appointment.getCheckInTime() != null ? appointment.getCheckInTime().format(FORMATTER) : "Just now"
        );

        String branch = appointment.getDoctor() != null && appointment.getDoctor().getBranchName() != null
                ? appointment.getDoctor().getBranchName()
                : "Main Campus";

        return executeSend(botToken, chatId, "PATIENT_CHECKED_IN", "Patient Check-In: " + queueNum, message, branch, "Operations/Reception");
    }

    @Override
    public boolean sendAdminAlert(String title, String text) {
        String botToken = getEffectiveBotToken();
        String chatId = getAdminChatId();

        String message = String.format(
                "⚠️ <b>MundulCare Alert</b> — <b>%s</b>\n" +
                "━━━━━━━━━━━━━━━━━━━━━\n" +
                "%s\n" +
                "━━━━━━━━━━━━━━━━━━━━━",
                title,
                text
        );

        return executeSend(botToken, chatId, "ADMIN_ALERT", title, message, "Global", "Administration");
    }

    @Override
    public boolean testConnection(String botToken, String chatId) {
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            return false;
        }
        String testMessage = "🔔 <b>MundulCare Notification Bot</b>\n\nConnection test successful! Your hospital Telegram notification integration is active and verified.";
        return dispatchToTelegramApi(botToken, chatId, testMessage);
    }

    private boolean executeSend(
            String botToken,
            String chatId,
            String eventType,
            String title,
            String messageHtml,
            String branchName,
            String departmentName
    ) {
        if (!isTelegramEnabled()) {
            log.info("Telegram notification skipped: telegram.enabled is false");
            recordDeliveryLog("TELEGRAM", eventType, chatId != null ? chatId : "N/A", branchName, departmentName, title, messageHtml, "SKIPPED", "Telegram notifications disabled in settings");
            return false;
        }

        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            log.warn("Telegram bot token or chat ID is not configured for event {}", eventType);
            recordDeliveryLog("TELEGRAM", eventType, chatId != null ? chatId : "MISSING_CONFIG", branchName, departmentName, title, messageHtml, "FAILED", "Bot token or Chat ID not configured");
            return false;
        }

        boolean success = dispatchToTelegramApi(botToken, chatId, messageHtml);
        recordDeliveryLog(
                "TELEGRAM",
                eventType,
                chatId,
                branchName,
                departmentName,
                title,
                messageHtml,
                success ? "SENT" : "FAILED",
                success ? null : "Telegram Bot API error"
        );
        return success;
    }

    private boolean dispatchToTelegramApi(String botToken, String chatId, String messageHtml) {
        try {
            String encodedText = URLEncoder.encode(messageHtml, StandardCharsets.UTF_8);
            String url = String.format(
                    "https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=HTML&disable_web_page_preview=true",
                    botToken.trim(),
                    chatId.trim(),
                    encodedText
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 && response.body().contains("\"ok\":true")) {
                log.info("Telegram message successfully sent to chat {}", chatId);
                return true;
            } else {
                log.error("Telegram API returned non-OK status: {} body: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send Telegram message to chat {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    private void recordDeliveryLog(
            String channel,
            String eventType,
            String recipient,
            String branch,
            String department,
            String title,
            String preview,
            String status,
            String error
    ) {
        try {
            deliveryLogRepo.save(NotificationDeliveryLog.builder()
                    .channel(channel)
                    .eventType(eventType)
                    .recipientTarget(recipient)
                    .branchName(branch)
                    .departmentName(department)
                    .title(title)
                    .messagePreview(preview)
                    .status(status)
                    .errorDetails(error)
                    .build());
        } catch (Exception e) {
            log.warn("Could not record delivery log: {}", e.getMessage());
        }
    }

    private String maskPatientName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Patient";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())) + "***";
        }
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "N/A";
        String clean = phone.trim();
        if (clean.length() < 7) return "***";
        return clean.substring(0, Math.min(4, clean.length())) + " *** " + clean.substring(Math.max(0, clean.length() - 3));
    }
}
