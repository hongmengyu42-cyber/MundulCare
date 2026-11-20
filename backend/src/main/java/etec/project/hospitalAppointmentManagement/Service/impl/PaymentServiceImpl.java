package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.AppointmentRepo;
import etec.project.hospitalAppointmentManagement.Repo.InvoiceRepo;
import etec.project.hospitalAppointmentManagement.Repo.PaymentTransactionRepo;
import etec.project.hospitalAppointmentManagement.Repo.UserRepo;
import etec.project.hospitalAppointmentManagement.Service.KhqrService;
import etec.project.hospitalAppointmentManagement.Service.NotificationService;
import etec.project.hospitalAppointmentManagement.Service.PaymentService;
import etec.project.hospitalAppointmentManagement.dto.request.InitiatePaymentRequest;
import etec.project.hospitalAppointmentManagement.dto.response.InitiatePaymentResponse;
import etec.project.hospitalAppointmentManagement.dto.response.InvoiceResponse;
import etec.project.hospitalAppointmentManagement.dto.response.PaymentStatusResponse;
import etec.project.hospitalAppointmentManagement.dto.response.VerifyPaymentResponse;
import etec.project.hospitalAppointmentManagement.entity.*;
import etec.project.hospitalAppointmentManagement.enums.InvoiceStatus;
import etec.project.hospitalAppointmentManagement.enums.PaymentTransactionStatus;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.BadRequest;
import etec.project.hospitalAppointmentManagement.exception.Forbidden;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final AppointmentRepo appointmentRepo;
    private final InvoiceRepo invoiceRepo;
    private final PaymentTransactionRepo transactionRepo;
    private final UserRepo userRepo;
    private final KhqrService khqrService;
    private final NotificationService notificationService;

    @Value("${bakong.account-id:mundulcare@aba}")
    private String bakongAccountId;

    @Value("${bakong.merchant-name:MundulCare Hospital}")
    private String merchantName;

    @Value("${bakong.merchant-city:Phnom Penh}")
    private String merchantCity;

    @Value("${bakong.acquiring-bank:ABA Bank}")
    private String acquiringBank;

    @Value("${bakong.api-base-url:https://bakong-dev.nbc.gov.kh/v1}")
    private String bakongApiBaseUrl;

    @Value("${bakong.api-token:}")
    private String bakongApiToken;

    @Value("${bakong.sandbox-mode:false}")
    private boolean sandboxMode;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    @Transactional
    public InitiatePaymentResponse initiateAppointmentPayment(InitiatePaymentRequest request, String currentUserEmail) {
        Appointment appointment = appointmentRepo.findById(request.getAppointmentId())
                .orElseThrow(() -> new NotFound("Appointment not found with ID: " + request.getAppointmentId()));

        User currentUser = userRepo.findByEmail(currentUserEmail)
                .orElseThrow(() -> new NotFound("User not found: " + currentUserEmail));

        // Authorization check: User must be appointment owner or staff/admin
        if (currentUser.getRole() == Role.PATIENT && !appointment.getPatientUser().getId().equals(currentUser.getId())) {
            throw new Forbidden("You are not authorized to initiate payment for this appointment.");
        }

        if ("PAID".equalsIgnoreCase(appointment.getPaymentStatus())) {
            throw new BadRequest("This appointment has already been paid in full.");
        }

        // Determine Amount & Currency
        String currency = (request.getCurrency() != null && !request.getCurrency().isBlank())
                ? request.getCurrency().toUpperCase()
                : "USD";

        Double amount = 25.0; // Default consultation baseline
        if (appointment.getDoctor() != null && appointment.getDoctor().getConsultationFee() != null && appointment.getDoctor().getConsultationFee() > 0) {
            amount = appointment.getDoctor().getConsultationFee();
        }

        if ("KHR".equals(currency)) {
            // Conversion if requested in KHR (standard 4,100 KHR/USD)
            amount = Math.round(amount * 4100.0 * 100.0) / 100.0;
        }

        // Check for active unexpired transaction for this appointment
        List<PaymentTransaction> existingTxns = transactionRepo.findByAppointmentIdOrderByCreatedAtDesc(appointment.getId());
        if (!existingTxns.isEmpty()) {
            PaymentTransaction latest = existingTxns.get(0);
            if (latest.getStatus() == PaymentTransactionStatus.PENDING && latest.getExpiresAt() != null && latest.getExpiresAt().isAfter(LocalDateTime.now())) {
                log.info("Reusing active unexpired transaction {} for appointment {}", latest.getTransactionId(), appointment.getId());
                return mapToInitiateResponse(latest);
            }
        }

        // Find or generate Invoice
        Invoice invoice = invoiceRepo.findByAppointmentId(appointment.getId())
                .orElseGet(() -> {
                    String invNum = "INV-2026-" + String.format("%06d", (int) (Math.random() * 900000 + 100000));
                    String branch = (appointment.getDoctor() != null && appointment.getDoctor().getBranchName() != null)
                            ? appointment.getDoctor().getBranchName()
                            : "MundulCare Main Campus (Phnom Penh)";
                    String dept = (appointment.getDoctor() != null && appointment.getDoctor().getSpecialties() != null && !appointment.getDoctor().getSpecialties().isEmpty())
                            ? appointment.getDoctor().getSpecialties().iterator().next().getName()
                            : "General Medicine";

                    return Invoice.builder()
                            .invoiceNumber(invNum)
                            .appointment(appointment)
                            .patientUser(appointment.getPatientUser())
                            .doctor(appointment.getDoctor())
                            .patientName(appointment.getPatientName())
                            .patientEmail(appointment.getPatientEmail())
                            .patientPhone(appointment.getPatientPhone())
                            .branchName(branch)
                            .departmentName(dept)
                            .subtotal(25.0)
                            .tax(0.0)
                            .totalAmount(25.0)
                            .currency("USD")
                            .status(InvoiceStatus.UNPAID)
                            .dueDate(LocalDateTime.now().plusHours(24))
                            .build();
                });

        invoice.setSubtotal(amount);
        invoice.setTotalAmount(amount);
        invoice.setCurrency(currency);
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice = invoiceRepo.save(invoice);

        // Generate Transaction ID
        String transactionId = "TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        // Generate genuine EMVCo Bakong KHQR
        String khqrString = khqrService.generateDynamicKhqr(
                bakongAccountId,
                merchantName,
                merchantCity,
                acquiringBank,
                amount,
                currency,
                invoice.getInvoiceNumber(),
                "APT-" + appointment.getId(),
                "Consultation Fee"
        );

        String md5Hash = khqrService.calculateMd5(khqrString);
        String qrImageBase64 = khqrService.generateQrCodeBase64(khqrString, 300, 300);

        PaymentTransaction transaction = PaymentTransaction.builder()
                .transactionId(transactionId)
                .invoice(invoice)
                .appointment(appointment)
                .paymentMethod("KHQR")
                .amount(amount)
                .currency(currency)
                .status(PaymentTransactionStatus.PENDING)
                .khqrString(khqrString)
                .khqrMd5Hash(md5Hash)
                .qrImageBase64(qrImageBase64)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        transaction = transactionRepo.save(transaction);
        log.info("Initiated KHQR Payment transaction {} with MD5 {}", transactionId, md5Hash);

        return mapToInitiateResponse(transaction);
    }

    @Override
    @Transactional
    public PaymentStatusResponse getTransactionStatus(String transactionId) {
        PaymentTransaction transaction = transactionRepo.findByTransactionId(transactionId)
                .orElseThrow(() -> new NotFound("Transaction not found: " + transactionId));

        // Auto-expire if overdue
        if (transaction.getStatus() == PaymentTransactionStatus.PENDING &&
                transaction.getExpiresAt() != null &&
                transaction.getExpiresAt().isBefore(LocalDateTime.now())) {
            transaction.setStatus(PaymentTransactionStatus.EXPIRED);
            transaction.setFailureReason("Transaction expired after 10 minutes without payment confirmation.");
            transactionRepo.save(transaction);

            Invoice invoice = transaction.getInvoice();
            if (invoice != null && invoice.getStatus() == InvoiceStatus.UNPAID) {
                invoice.setStatus(InvoiceStatus.EXPIRED);
                invoiceRepo.save(invoice);
            }
        }

        return PaymentStatusResponse.builder()
                .transactionId(transaction.getTransactionId())
                .invoiceNumber(transaction.getInvoice() != null ? transaction.getInvoice().getInvoiceNumber() : null)
                .appointmentId(transaction.getAppointment() != null ? transaction.getAppointment().getId() : null)
                .status(transaction.getStatus().name())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .expiresAt(transaction.getExpiresAt())
                .verifiedAt(transaction.getVerifiedAt())
                .failureReason(transaction.getFailureReason())
                .build();
    }

    @Override
    @Transactional
    public VerifyPaymentResponse verifyPayment(String transactionId, String currentUserEmail) {
        PaymentTransaction transaction = transactionRepo.findByTransactionId(transactionId)
                .orElseThrow(() -> new NotFound("Transaction not found: " + transactionId));

        if (transaction.getStatus() == PaymentTransactionStatus.SUCCESS) {
            return VerifyPaymentResponse.builder()
                    .transactionId(transaction.getTransactionId())
                    .invoiceNumber(transaction.getInvoice() != null ? transaction.getInvoice().getInvoiceNumber() : null)
                    .status("SUCCESS")
                    .amount(transaction.getAmount())
                    .currency(transaction.getCurrency())
                    .verifiedAt(transaction.getVerifiedAt())
                    .payerAccountId(transaction.getPayerAccountId())
                    .payerName(transaction.getPayerName())
                    .message("Payment was previously verified and confirmed.")
                    .build();
        }

        if (transaction.getStatus() == PaymentTransactionStatus.EXPIRED) {
            throw new BadRequest("This payment request has expired. Please initiate a new KHQR code.");
        }

        boolean verified = false;
        String payerAccount = "N/A";
        String payerName = "Bakong Payer";
        String gatewayRef = null;

        // Check if genuine Bakong API token is provided
        if (bakongApiToken != null && !bakongApiToken.isBlank() && !bakongApiToken.equalsIgnoreCase("sandbox")) {
            // Live verification with National Bank of Cambodia Bakong Open API
            try {
                String verifyUrl = bakongApiBaseUrl + "/check_transaction_by_md5";
                String jsonPayload = String.format("{\"md5\":\"%s\"}", transaction.getKhqrMd5Hash());

                HttpRequest apiRequest = HttpRequest.newBuilder()
                        .uri(URI.create(verifyUrl))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + bakongApiToken.trim())
                        .timeout(Duration.ofSeconds(10))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = httpClient.send(apiRequest, HttpResponse.BodyHandlers.ofString());
                log.info("Bakong check_transaction_by_md5 response code: {} body: {}", response.statusCode(), response.body());

                if (response.statusCode() == 200 && response.body().contains("\"responseCode\":0")) {
                    verified = true;
                    gatewayRef = "BAKONG-" + transaction.getKhqrMd5Hash().substring(0, 10);
                } else {
                    return VerifyPaymentResponse.builder()
                            .transactionId(transaction.getTransactionId())
                            .invoiceNumber(transaction.getInvoice() != null ? transaction.getInvoice().getInvoiceNumber() : null)
                            .status("PENDING")
                            .amount(transaction.getAmount())
                            .currency(transaction.getCurrency())
                            .message("Payment has not yet been detected on the NBC Bakong network. Please ensure the transfer is completed in your banking app.")
                            .build();
                }
            } catch (Exception e) {
                log.error("Failed to query Bakong Open API: {}", e.getMessage());
                throw new BadRequest("Error connecting to National Bank of Cambodia Bakong API: " + e.getMessage());
            }
        } else if (sandboxMode) {
            // Explicit Developer Sandbox Simulation Mode
            log.warn("DEVELOPER SANDBOX MODE ACTIVE: Simulating verification for transaction {}", transactionId);
            verified = true;
            payerAccount = "sandbox.test@aba";
            payerName = "Dev Sandbox Payer";
            gatewayRef = "SANDBOX-" + System.currentTimeMillis();
        } else {
            // Real security enforcement: No fake verification allowed unless explicit sandbox mode
            throw new BadRequest(
                    "NBC Bakong API Token is not configured. Please supply your Bakong Merchant Bearer Token in backend application.properties (bakong.api-token) or configure via the Admin Notification Settings."
            );
        }

        if (verified) {
            LocalDateTime now = LocalDateTime.now();
            transaction.setStatus(PaymentTransactionStatus.SUCCESS);
            transaction.setVerifiedAt(now);
            transaction.setPayerAccountId(payerAccount);
            transaction.setPayerName(payerName);
            transaction.setGatewayTransactionId(gatewayRef);
            transactionRepo.save(transaction);

            // Update Invoice
            Invoice invoice = transaction.getInvoice();
            if (invoice != null) {
                invoice.setStatus(InvoiceStatus.PAID);
                invoice.setPaidAt(now);
                invoiceRepo.save(invoice);
            }

            // Update Appointment
            Appointment appointment = transaction.getAppointment();
            if (appointment != null) {
                appointment.setPaymentStatus("PAID");
                appointment.setPaidAmount(transaction.getAmount());
                appointment.setPaidAt(now);
                appointment.setPaymentMethod(transaction.getPaymentMethod());
                appointment.setPaymentTransactionId(transaction.getTransactionId());
                appointmentRepo.save(appointment);
            }

            // Trigger Centralized Notifications (In-App + Telegram Finance Alert)
            notificationService.handlePaymentSuccess(transaction);

            return VerifyPaymentResponse.builder()
                    .transactionId(transaction.getTransactionId())
                    .invoiceNumber(invoice != null ? invoice.getInvoiceNumber() : null)
                    .status("SUCCESS")
                    .amount(transaction.getAmount())
                    .currency(transaction.getCurrency())
                    .verifiedAt(now)
                    .payerAccountId(payerAccount)
                    .payerName(payerName)
                    .message("Payment verified successfully via NBC Bakong network.")
                    .build();
        }

        return VerifyPaymentResponse.builder()
                .transactionId(transaction.getTransactionId())
                .status("PENDING")
                .message("Payment confirmation pending.")
                .build();
    }

    @Override
    @Transactional
    public void handleBakongWebhook(Map<String, Object> payload) {
        log.info("Received Bakong webhook callback: {}", payload);
        if (payload == null) return;

        String md5 = (String) payload.get("md5");
        if (md5 == null || md5.isBlank()) return;

        Optional<PaymentTransaction> txnOpt = transactionRepo.findByKhqrMd5Hash(md5.toLowerCase());
        if (txnOpt.isEmpty()) {
            log.warn("Webhook received for unknown KHQR MD5: {}", md5);
            return;
        }

        PaymentTransaction transaction = txnOpt.get();
        if (transaction.getStatus() == PaymentTransactionStatus.SUCCESS) {
            log.info("Transaction {} already marked SUCCESS", transaction.getTransactionId());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        transaction.setStatus(PaymentTransactionStatus.SUCCESS);
        transaction.setVerifiedAt(now);
        transaction.setGatewayTransactionId((String) payload.getOrDefault("externalTransactionId", "WH-" + md5.substring(0, 8)));
        transactionRepo.save(transaction);

        Invoice invoice = transaction.getInvoice();
        if (invoice != null) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(now);
            invoiceRepo.save(invoice);
        }

        Appointment appointment = transaction.getAppointment();
        if (appointment != null) {
            appointment.setPaymentStatus("PAID");
            appointment.setPaidAmount(transaction.getAmount());
            appointment.setPaidAt(now);
            appointment.setPaymentMethod(transaction.getPaymentMethod());
            appointment.setPaymentTransactionId(transaction.getTransactionId());
            appointmentRepo.save(appointment);
        }

        notificationService.handlePaymentSuccess(transaction);
    }

    @Override
    public InvoiceResponse getInvoiceById(Long invoiceId, String currentUserEmail) {
        Invoice invoice = invoiceRepo.findById(invoiceId)
                .orElseThrow(() -> new NotFound("Invoice not found with ID: " + invoiceId));
        return mapToInvoiceResponse(invoice);
    }

    @Override
    public InvoiceResponse getInvoiceByAppointmentId(Long appointmentId, String currentUserEmail) {
        Invoice invoice = invoiceRepo.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new NotFound("Invoice not found for appointment ID: " + appointmentId));
        return mapToInvoiceResponse(invoice);
    }

    @Override
    public List<InvoiceResponse> getMyInvoices(String currentUserEmail) {
        User user = userRepo.findByEmail(currentUserEmail)
                .orElseThrow(() -> new NotFound("User not found: " + currentUserEmail));
        return invoiceRepo.findByPatientUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::mapToInvoiceResponse).collect(Collectors.toList());
    }

    @Override
    public List<InvoiceResponse> getAllInvoices(String branchFilter) {
        List<Invoice> list;
        if (branchFilter != null && !branchFilter.isBlank() && !"ALL".equalsIgnoreCase(branchFilter)) {
            list = invoiceRepo.findByBranchNameOrderByCreatedAtDesc(branchFilter);
        } else {
            list = invoiceRepo.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::mapToInvoiceResponse).collect(Collectors.toList());
    }

    private InitiatePaymentResponse mapToInitiateResponse(PaymentTransaction t) {
        return InitiatePaymentResponse.builder()
                .transactionId(t.getTransactionId())
                .invoiceNumber(t.getInvoice() != null ? t.getInvoice().getInvoiceNumber() : null)
                .appointmentId(t.getAppointment() != null ? t.getAppointment().getId() : null)
                .amount(t.getAmount())
                .currency(t.getCurrency())
                .khqrString(t.getKhqrString())
                .khqrMd5Hash(t.getKhqrMd5Hash())
                .qrImageBase64(t.getQrImageBase64())
                .bakongDeepLink("bakong://qr?data=" + (t.getKhqrString() != null ? t.getKhqrString() : ""))
                .expiresAt(t.getExpiresAt())
                .status(t.getStatus().name())
                .build();
    }

    private InvoiceResponse mapToInvoiceResponse(Invoice inv) {
        String docName = (inv.getDoctor() != null && inv.getDoctor().getUser() != null)
                ? inv.getDoctor().getUser().getName()
                : "Assigned Physician";
        String specialty = (inv.getDoctor() != null && inv.getDoctor().getSpecialties() != null && !inv.getDoctor().getSpecialties().isEmpty())
                ? inv.getDoctor().getSpecialties().iterator().next().getName()
                : "General";

        return InvoiceResponse.builder()
                .id(inv.getId())
                .invoiceNumber(inv.getInvoiceNumber())
                .appointmentId(inv.getAppointment() != null ? inv.getAppointment().getId() : null)
                .patientName(inv.getPatientName())
                .patientEmail(inv.getPatientEmail())
                .patientPhone(inv.getPatientPhone())
                .doctorName(docName)
                .doctorSpecialty(specialty)
                .branchName(inv.getBranchName())
                .departmentName(inv.getDepartmentName())
                .subtotal(inv.getSubtotal())
                .tax(inv.getTax())
                .totalAmount(inv.getTotalAmount())
                .currency(inv.getCurrency())
                .status(inv.getStatus().name())
                .dueDate(inv.getDueDate())
                .paidAt(inv.getPaidAt())
                .createdAt(inv.getCreatedAt())
                .build();
    }
}
