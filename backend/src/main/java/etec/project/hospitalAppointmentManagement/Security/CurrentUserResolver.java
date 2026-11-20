package etec.project.hospitalAppointmentManagement.Security;

import etec.project.hospitalAppointmentManagement.Repo.DoctorRepo;
import etec.project.hospitalAppointmentManagement.Repo.UserRepo;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.User;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.Forbidden;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private final UserRepo userRepo;
    private final DoctorRepo doctorRepo;

    public User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new Forbidden("Unauthorized. Please log in first.");
        }
        return userRepo.findByEmail(authentication.getName())
                .orElseThrow(() -> new NotFound("User account not found: " + authentication.getName()));
    }

    public Doctor requireDoctor(Authentication authentication) {
        User user = requireUser(authentication);
        if (user.getRole() != Role.DOCTOR) {
            throw new Forbidden("Access denied. Doctor role required.");
        }
        return doctorRepo.findByUserId(user.getId())
                .or(() -> doctorRepo.findByEmailIgnoreCase(user.getEmail()))
                .orElseThrow(() -> new Forbidden("No doctor profile is linked to this account."));
    }
}
