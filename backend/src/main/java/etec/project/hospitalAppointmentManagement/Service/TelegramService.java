package etec.project.hospitalAppointmentManagement.Service;

import etec.project.hospitalAppointmentManagement.entity.Appointment;
import etec.project.hospitalAppointmentManagement.entity.Invoice;
import etec.project.hospitalAppointmentManagement.entity.PaymentTransaction;

public interface TelegramService {

    /**
     * Sends an immediate financial notification to the Finance Department Telegram channel
     * upon verified genuine payment. Strictly masks sensitive patient medical info (HIPAA compliant).
     */
    boolean sendFinancePaymentAlert(Invoice invoice, PaymentTransaction transaction);

    /**
     * Sends a check-in alert to the Front-Desk / Nursing Operations channel.
     */
    boolean sendOperationsCheckInAlert(Appointment appointment);

    /**
     * Sends a administrative alert to the Hospital Admin channel.
     */
    boolean sendAdminAlert(String title, String message);

    /**
     * Tests connectivity to a given Telegram Bot Token and Chat ID.
     */
    boolean testConnection(String botToken, String chatId);
}
