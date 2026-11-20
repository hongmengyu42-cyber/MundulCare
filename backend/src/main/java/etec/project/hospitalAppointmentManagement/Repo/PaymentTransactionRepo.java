package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.PaymentTransaction;
import etec.project.hospitalAppointmentManagement.enums.PaymentTransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepo extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByTransactionId(String transactionId);

    Optional<PaymentTransaction> findByKhqrMd5Hash(String khqrMd5Hash);

    List<PaymentTransaction> findByAppointmentIdOrderByCreatedAtDesc(Long appointmentId);

    List<PaymentTransaction> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);

    List<PaymentTransaction> findByStatusAndExpiresAtBefore(PaymentTransactionStatus status, LocalDateTime now);

    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}
