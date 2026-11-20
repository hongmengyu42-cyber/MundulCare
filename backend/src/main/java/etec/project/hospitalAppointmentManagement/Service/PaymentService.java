package etec.project.hospitalAppointmentManagement.Service;

import etec.project.hospitalAppointmentManagement.dto.request.InitiatePaymentRequest;
import etec.project.hospitalAppointmentManagement.dto.response.InitiatePaymentResponse;
import etec.project.hospitalAppointmentManagement.dto.response.InvoiceResponse;
import etec.project.hospitalAppointmentManagement.dto.response.PaymentStatusResponse;
import etec.project.hospitalAppointmentManagement.dto.response.VerifyPaymentResponse;

import java.util.List;
import java.util.Map;

public interface PaymentService {

    InitiatePaymentResponse initiateAppointmentPayment(InitiatePaymentRequest request, String currentUserEmail);

    PaymentStatusResponse getTransactionStatus(String transactionId);

    VerifyPaymentResponse verifyPayment(String transactionId, String currentUserEmail);

    void handleBakongWebhook(Map<String, Object> payload);

    InvoiceResponse getInvoiceById(Long invoiceId, String currentUserEmail);

    InvoiceResponse getInvoiceByAppointmentId(Long appointmentId, String currentUserEmail);

    List<InvoiceResponse> getMyInvoices(String currentUserEmail);

    List<InvoiceResponse> getAllInvoices(String branchFilter);
}
