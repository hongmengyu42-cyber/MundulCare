package etec.project.hospitalAppointmentManagement.Service;

import etec.project.hospitalAppointmentManagement.dto.request.BookAppointmentRequest;
import etec.project.hospitalAppointmentManagement.dto.request.CompleteConsultationRequest;
import etec.project.hospitalAppointmentManagement.dto.request.UpdateAppointmentStatusRequest;
import etec.project.hospitalAppointmentManagement.dto.response.AppointmentResponse;

import java.util.List;

public interface AppointmentService {

    AppointmentResponse bookAppointment(Long userId, BookAppointmentRequest request);

    List<AppointmentResponse> getMyAppointments(Long userId);

    List<AppointmentResponse> getAllAppointments();

    AppointmentResponse getAppointmentById(Long appointmentId);

    AppointmentResponse cancelAppointment(Long appointmentId, Long userId);

    AppointmentResponse updateStatus(Long appointmentId, UpdateAppointmentStatusRequest request);

    AppointmentResponse checkIn(Long appointmentId);

    AppointmentResponse callQueue(Long appointmentId, String roomNumber);

    AppointmentResponse startConsultation(Long appointmentId);

    AppointmentResponse completeConsultation(Long appointmentId, CompleteConsultationRequest request);

    List<AppointmentResponse> getLiveQueue(String branchName);
}
