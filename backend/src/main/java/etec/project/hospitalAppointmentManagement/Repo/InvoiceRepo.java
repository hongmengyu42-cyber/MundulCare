package etec.project.hospitalAppointmentManagement.Repo;

import etec.project.hospitalAppointmentManagement.entity.Invoice;
import etec.project.hospitalAppointmentManagement.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepo extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findByAppointmentId(Long appointmentId);

    List<Invoice> findByPatientUserIdOrderByCreatedAtDesc(Long patientUserId);

    List<Invoice> findByBranchNameOrderByCreatedAtDesc(String branchName);

    List<Invoice> findByStatusOrderByCreatedAtDesc(InvoiceStatus status);

    List<Invoice> findAllByOrderByCreatedAtDesc();
}
