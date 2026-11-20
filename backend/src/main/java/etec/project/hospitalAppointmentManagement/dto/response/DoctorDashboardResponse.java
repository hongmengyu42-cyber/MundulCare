package etec.project.hospitalAppointmentManagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorDashboardResponse {
    private DoctorResponse doctorProfile;
    private long totalAppointments;
    private long todayAppointmentsCount;
    private long upcomingAppointmentsCount;
    private long completedAppointmentsCount;
    private long pendingRequestsCount;
    private long cancelledAppointmentsCount;
    private long rejectedAppointmentsCount;
    private long totalAssignedPatients;
    private long totalMedicalRecordsAuthored;
    private long totalPrescriptionsIssued;
    private long unreadNotificationsCount;

    // Status breakdown e.g. {"PENDING": 2, "CONFIRMED": 5, "COMPLETED": 10, ...}
    private Map<String, Long> statusBreakdown;

    // Last 7 days daily counts for chart
    private List<DailyStatPoint> weeklyTrend;

    // Today's appointments sorted chronologically
    private List<AppointmentResponse> todaySchedule;

    // Pending appointment requests needing action
    private List<AppointmentResponse> pendingRequests;

    // Next upcoming confirmed appointments
    private List<AppointmentResponse> upcomingAppointments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyStatPoint {
        private String date; // yyyy-MM-dd
        private String label; // e.g. "Mon", "Tue"
        private long total;
        private long completed;
        private long confirmed;
        private long pending;
    }
}
