package etec.project.hospitalAppointmentManagement.controller;

import etec.project.hospitalAppointmentManagement.Service.PaymentService;
import etec.project.hospitalAppointmentManagement.dto.request.InitiatePaymentRequest;
import etec.project.hospitalAppointmentManagement.dto.response.ApiResponse;
import etec.project.hospitalAppointmentManagement.dto.response.InitiatePaymentResponse;
import etec.project.hospitalAppointmentManagement.dto.response.PaymentStatusResponse;
import etec.project.hospitalAppointmentManagement.dto.response.VerifyPaymentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Endpoints for genuine NBC Bakong KHQR dynamic payment generation & verification")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/initiate")
    @Operation(summary = "Initiate dynamic KHQR payment", description = "Generates genuine EMVCo Bakong KHQR code for appointment consultation fee")
    public ResponseEntity<ApiResponse<InitiatePaymentResponse>> initiatePayment(
            Authentication authentication,
            @Valid @RequestBody InitiatePaymentRequest request
    ) {
        String email = authentication != null ? authentication.getName() : null;
        InitiatePaymentResponse response = paymentService.initiateAppointmentPayment(request, email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Dynamic KHQR code generated successfully.", response));
    }

    @GetMapping("/{transactionId}/status")
    @Operation(summary = "Get transaction status", description = "Polls real-time transaction payment status")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getStatus(
            @PathVariable String transactionId
    ) {
        PaymentStatusResponse response = paymentService.getTransactionStatus(transactionId);
        return ResponseEntity.ok(ApiResponse.success("Payment status retrieved.", response));
    }

    @PostMapping("/{transactionId}/verify")
    @Operation(summary = "Verify Bakong payment", description = "Verifies real transaction against the National Bank of Cambodia Bakong Open API")
    public ResponseEntity<ApiResponse<VerifyPaymentResponse>> verifyPayment(
            Authentication authentication,
            @PathVariable String transactionId
    ) {
        String email = authentication != null ? authentication.getName() : null;
        VerifyPaymentResponse response = paymentService.verifyPayment(transactionId, email);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

    @PostMapping("/webhook/bakong")
    @Operation(summary = "Bakong payment webhook", description = "Asynchronous callback endpoint from payment gateway / NBC Bakong")
    public ResponseEntity<ApiResponse<String>> handleWebhook(@RequestBody Map<String, Object> payload) {
        paymentService.handleBakongWebhook(payload);
        return ResponseEntity.ok(ApiResponse.success("Webhook received and processed.", "OK"));
    }
}
