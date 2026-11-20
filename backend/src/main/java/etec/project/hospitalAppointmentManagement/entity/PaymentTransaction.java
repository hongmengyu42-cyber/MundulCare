package etec.project.hospitalAppointmentManagement.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import etec.project.hospitalAppointmentManagement.enums.PaymentTransactionStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, unique = true, length = 80)
    private String transactionId; // e.g. "TXN-2026-928172"

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(name = "payment_method", nullable = false, length = 40)
    @Builder.Default
    private String paymentMethod = "KHQR"; // KHQR, BAKONG, CREDIT_CARD, CASH

    @Column(nullable = false)
    private Double amount;

    @Column(length = 10, nullable = false)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentTransactionStatus status = PaymentTransactionStatus.INITIALIZED;

    @Column(name = "khqr_string", columnDefinition = "TEXT")
    private String khqrString;

    @Column(name = "khqr_md5_hash", length = 64)
    private String khqrMd5Hash;

    @Column(name = "qr_image_base64", columnDefinition = "LONGTEXT")
    private String qrImageBase64;

    @Column(name = "gateway_transaction_id", length = 120)
    private String gatewayTransactionId; // External bank or Bakong tx ID

    @Column(name = "payer_account_id", length = 100)
    private String payerAccountId; // e.g. sokha@aba

    @Column(name = "payer_name", length = 120)
    private String payerName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
