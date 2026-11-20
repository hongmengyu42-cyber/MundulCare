package etec.project.hospitalAppointmentManagement.controller;

import etec.project.hospitalAppointmentManagement.Service.PaymentService;
import etec.project.hospitalAppointmentManagement.dto.response.ApiResponse;
import etec.project.hospitalAppointmentManagement.dto.response.InvoiceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Hospital Invoicing, Billing, and Official Receipt Management")
public class InvoiceController {

    private final PaymentService paymentService;

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice by ID")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoice(
            Authentication authentication,
            @PathVariable Long id
    ) {
        String email = authentication != null ? authentication.getName() : null;
        InvoiceResponse response = paymentService.getInvoiceById(id, email);
        return ResponseEntity.ok(ApiResponse.success("Invoice retrieved.", response));
    }

    @GetMapping("/appointment/{appointmentId}")
    @Operation(summary = "Get invoice by appointment ID")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId
    ) {
        String email = authentication != null ? authentication.getName() : null;
        InvoiceResponse response = paymentService.getInvoiceByAppointmentId(appointmentId, email);
        return ResponseEntity.ok(ApiResponse.success("Invoice retrieved.", response));
    }

    @GetMapping("/my-invoices")
    @Operation(summary = "Get patient invoices")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getMyInvoices(
            Authentication authentication
    ) {
        String email = authentication != null ? authentication.getName() : null;
        List<InvoiceResponse> list = paymentService.getMyInvoices(email);
        return ResponseEntity.ok(ApiResponse.success("Patient invoices retrieved.", list));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @Operation(summary = "Get all hospital invoices (Admin/Staff)")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices(
            @RequestParam(required = false) String branch
    ) {
        List<InvoiceResponse> list = paymentService.getAllInvoices(branch);
        return ResponseEntity.ok(ApiResponse.success("All invoices retrieved.", list));
    }
}
