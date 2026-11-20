package etec.project.hospitalAppointmentManagement.Service.impl;

import etec.project.hospitalAppointmentManagement.Repo.*;
import etec.project.hospitalAppointmentManagement.Service.DoctorService;
import etec.project.hospitalAppointmentManagement.Service.FileStorageService;
import etec.project.hospitalAppointmentManagement.dto.request.DoctorRequest;
import etec.project.hospitalAppointmentManagement.dto.request.DoctorScheduleDto;
import etec.project.hospitalAppointmentManagement.dto.request.ProvisionDoctorAccountRequest;
import etec.project.hospitalAppointmentManagement.dto.response.DoctorResponse;
import etec.project.hospitalAppointmentManagement.dto.response.SpecialtyResponse;
import etec.project.hospitalAppointmentManagement.dto.response.UnavailableDateResponse;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.DoctorSchedule;
import etec.project.hospitalAppointmentManagement.entity.Specialty;
import etec.project.hospitalAppointmentManagement.entity.User;
import etec.project.hospitalAppointmentManagement.enums.AuthProvider;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepo doctorRepo;
    private final SpecialtyRepo specialtyRepo;
    private final DoctorScheduleRepo doctorScheduleRepo;
    private final DoctorUnavailableDateRepo doctorUnavailableDateRepo;
    private final AppointmentRepo appointmentRepo;
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    private static final String DOCTOR_IMAGE_SUBFOLDER = "doctor-images";

    @Override
    public List<DoctorResponse> getAllDoctors(Long specialtyId, String search) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        List<Doctor> doctors;

        if (specialtyId != null && cleanSearch != null) {
            doctors = doctorRepo.searchBySpecialtyAndNameOrBio(specialtyId, cleanSearch);
        } else if (specialtyId != null) {
            doctors = doctorRepo.findBySpecialtyId(specialtyId);
        } else if (cleanSearch != null) {
            doctors = doctorRepo.searchByNameOrBio(cleanSearch);
        } else {
            doctors = doctorRepo.findByIsActiveTrue();
        }

        return doctors.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<DoctorResponse> getAllDoctorsForAdmin() {
        return doctorRepo.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public DoctorResponse getDoctorById(Long id) {
        Doctor doctor = doctorRepo.findById(id)
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + id));
        return mapToResponse(doctor);
    }

    @Override
    @Transactional
    public DoctorResponse createDoctor(DoctorRequest request) {
        if (doctorRepo.existsByLicenseNumber(request.getLicenseNumber().trim())) {
            throw new RuntimeException("Doctor with license number already exists: " + request.getLicenseNumber());
        }

        if (doctorRepo.existsByEmail(request.getEmail().trim())) {
            throw new RuntimeException("Doctor with email already exists: " + request.getEmail());
        }

        // Fetch assigned specialties
        List<Specialty> specialties = specialtyRepo.findAllById(request.getSpecialtyIds());
        if (specialties.isEmpty()) {
            throw new RuntimeException("Invalid specialties provided.");
        }

        Doctor doctor = Doctor.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim())
                .phone(request.getPhone())
                .gender(request.getGender())
                .profileImage(request.getProfileImage())
                .licenseNumber(request.getLicenseNumber().trim())
                .bio(request.getBio())
                .qualifications(request.getQualifications())
                .experienceYears(request.getExperienceYears())
                .consultationFee(request.getConsultationFee())
                .address(request.getAddress())
                .branchName(request.getBranchName() != null && !request.getBranchName().isBlank()
                        ? request.getBranchName().trim()
                        : (specialties.get(0).getBranchName() != null
                                ? specialties.get(0).getBranchName()
                                : "MundulCare Main Campus (Phnom Penh)"))
                .appointmentDurationMinutes(request.getAppointmentDurationMinutes() != null ? request.getAppointmentDurationMinutes() : 30)
                .isActive(request.getIsActive() == null || request.getIsActive())
                .specialties(new HashSet<>(specialties))
                .build();

        doctor = doctorRepo.save(doctor);

        // Save schedules if provided
        if (request.getSchedules() != null && !request.getSchedules().isEmpty()) {
            final Doctor savedDoctor = doctor;
            List<DoctorSchedule> schedules = request.getSchedules().stream()
                    .map(dto -> DoctorSchedule.builder()
                            .doctor(savedDoctor)
                            .dayOfWeek(dto.getDayOfWeek().toUpperCase())
                            .startTime(dto.getStartTime())
                            .endTime(dto.getEndTime())
                            .breakStart(dto.getBreakStart())
                            .breakEnd(dto.getBreakEnd())
                            .isAvailable(dto.getIsAvailable() == null || dto.getIsAvailable())
                            .build())
                    .collect(Collectors.toList());
            doctorScheduleRepo.saveAll(schedules);
        }

        return mapToResponse(doctor);
    }

    @Override
    @Transactional
    public DoctorResponse updateDoctor(Long id, DoctorRequest request) {
        Doctor doctor = doctorRepo.findById(id)
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + id));

        // License uniqueness check
        if (!doctor.getLicenseNumber().equalsIgnoreCase(request.getLicenseNumber().trim()) &&
                doctorRepo.existsByLicenseNumber(request.getLicenseNumber().trim())) {
            throw new RuntimeException("License number already in use: " + request.getLicenseNumber());
        }

        // Email uniqueness check
        if (!doctor.getEmail().equalsIgnoreCase(request.getEmail().trim()) &&
                doctorRepo.existsByEmail(request.getEmail().trim())) {
            throw new RuntimeException("Email already in use: " + request.getEmail());
        }

        List<Specialty> specialties = specialtyRepo.findAllById(request.getSpecialtyIds());
        if (specialties.isEmpty()) {
            throw new RuntimeException("Invalid specialties provided.");
        }

        doctor.setName(request.getName().trim());
        doctor.setEmail(request.getEmail().trim());
        doctor.setPhone(request.getPhone());
        if (request.getGender() != null) {
            doctor.setGender(request.getGender());
        }
        // profileImage is intentionally NOT touched here - it's only changed via the
        // dedicated upload/delete-profile-image endpoints, so a plain info edit here
        // (which never sends the current photo back) can't silently wipe it out.
        doctor.setLicenseNumber(request.getLicenseNumber().trim());
        doctor.setBio(request.getBio());
        if (request.getQualifications() != null) {
            doctor.setQualifications(request.getQualifications());
        }
        doctor.setExperienceYears(request.getExperienceYears());
        doctor.setConsultationFee(request.getConsultationFee());
        doctor.setAddress(request.getAddress());
        if (request.getBranchName() != null && !request.getBranchName().isBlank()) {
            doctor.setBranchName(request.getBranchName().trim());
        } else if (doctor.getBranchName() == null || doctor.getBranchName().isBlank()) {
            doctor.setBranchName(specialties.get(0).getBranchName() != null
                    ? specialties.get(0).getBranchName()
                    : "MundulCare Main Campus (Phnom Penh)");
        }
        if (request.getAppointmentDurationMinutes() != null) {
            doctor.setAppointmentDurationMinutes(request.getAppointmentDurationMinutes());
        }
        doctor.setSpecialties(new HashSet<>(specialties));
        if (request.getIsActive() != null) {
            doctor.setActive(request.getIsActive());
        }

        if (doctor.getUser() != null) {
            User linkedUser = doctor.getUser();
            linkedUser.setName(doctor.getName());
            linkedUser.setPhone(doctor.getPhone());
            userRepo.save(linkedUser);
        }

        doctor = doctorRepo.save(doctor);

        // Update schedules
        if (request.getSchedules() != null) {
            doctorScheduleRepo.deleteByDoctorId(doctor.getId());
            final Doctor savedDoctor = doctor;
            List<DoctorSchedule> schedules = request.getSchedules().stream()
                    .map(dto -> DoctorSchedule.builder()
                            .doctor(savedDoctor)
                            .dayOfWeek(dto.getDayOfWeek().toUpperCase())
                            .startTime(dto.getStartTime())
                            .endTime(dto.getEndTime())
                            .breakStart(dto.getBreakStart())
                            .breakEnd(dto.getBreakEnd())
                            .isAvailable(dto.getIsAvailable() == null || dto.getIsAvailable())
                            .build())
                    .collect(Collectors.toList());
            doctorScheduleRepo.saveAll(schedules);
        }

        return mapToResponse(doctor);
    }

    @Override
    @Transactional
    public DoctorResponse provisionDoctorAccount(Long doctorId, ProvisionDoctorAccountRequest request) {
        Doctor doctor = doctorRepo.findById(doctorId)
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + doctorId));

        String targetEmail = (request.getEmail() != null && !request.getEmail().trim().isEmpty())
                ? request.getEmail().trim()
                : doctor.getEmail().trim();

        User account = doctor.getUser();
        if (account != null) {
            // Update password (and optionally email if changed and free)
            if (!account.getEmail().equalsIgnoreCase(targetEmail)) {
                Optional<User> existingEmailUser = userRepo.findByEmail(targetEmail);
                if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(account.getId())) {
                    throw new RuntimeException("Another user account already uses email: " + targetEmail);
                }
                account.setEmail(targetEmail);
            }
            account.setName(doctor.getName());
            account.setPhone(doctor.getPhone());
            account.setProfileImage(doctor.getProfileImage());
            account.setPassword(passwordEncoder.encode(request.getPassword()));
            account.setRole(Role.DOCTOR);
            account.setVerified(true);
            userRepo.save(account);
        } else {
            Optional<User> existingOpt = userRepo.findByEmail(targetEmail);
            if (existingOpt.isPresent()) {
                User existing = existingOpt.get();
                if (existing.getRole() == Role.ADMIN) {
                    throw new RuntimeException("Cannot convert an ADMIN user account into a DOCTOR account.");
                }
                Optional<Doctor> otherDoctor = doctorRepo.findByUserId(existing.getId());
                if (otherDoctor.isPresent() && !otherDoctor.get().getId().equals(doctor.getId())) {
                    throw new RuntimeException("User account is already linked to another doctor: " + otherDoctor.get().getName());
                }
                existing.setName(doctor.getName());
                existing.setPhone(doctor.getPhone());
                existing.setProfileImage(doctor.getProfileImage());
                existing.setPassword(passwordEncoder.encode(request.getPassword()));
                existing.setRole(Role.DOCTOR);
                existing.setVerified(true);
                account = userRepo.save(existing);
            } else {
                account = userRepo.save(User.builder()
                        .name(doctor.getName())
                        .email(targetEmail)
                        .password(passwordEncoder.encode(request.getPassword()))
                        .phone(doctor.getPhone())
                        .profileImage(doctor.getProfileImage())
                        .role(Role.DOCTOR)
                        .authProvider(AuthProvider.LOCAL)
                        .isVerified(true)
                        .build());
            }
            doctor.setUser(account);
            doctor = doctorRepo.save(doctor);
        }

        return mapToResponse(doctor);
    }

    @Override
    @Transactional
    public void deleteDoctor(Long id) {
        if (!doctorRepo.existsById(id)) {
            throw new NotFound("Doctor not found with ID: " + id);
        }
        doctorUnavailableDateRepo.deleteByDoctorId(id);
        doctorScheduleRepo.deleteByDoctorId(id);
        appointmentRepo.deleteByDoctorId(id);
        doctorRepo.deleteById(id);
    }

    @Override
    @Transactional
    public String uploadProfileImage(Long doctorId, org.springframework.web.multipart.MultipartFile file) {
        Doctor doctor = doctorRepo.findById(doctorId)
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + doctorId));
        String oldImage = doctor.getProfileImage();

        String newImageUrl = fileStorageService.store(file, DOCTOR_IMAGE_SUBFOLDER);
        doctor.setProfileImage(newImageUrl);
        doctorRepo.save(doctor);

        if (doctor.getUser() != null) {
            User linkedUser = doctor.getUser();
            linkedUser.setProfileImage(newImageUrl);
            userRepo.save(linkedUser);
        }

        if (oldImage != null) {
            fileStorageService.delete(oldImage);
        }
        return newImageUrl;
    }

    @Override
    @Transactional
    public void deleteProfileImage(Long doctorId) {
        Doctor doctor = doctorRepo.findById(doctorId)
                .orElseThrow(() -> new NotFound("Doctor not found with ID: " + doctorId));
        String oldImage = doctor.getProfileImage();
        if (oldImage == null) {
            return;
        }
        doctor.setProfileImage(null);
        doctorRepo.save(doctor);
        if (doctor.getUser() != null) {
            User linkedUser = doctor.getUser();
            linkedUser.setProfileImage(null);
            userRepo.save(linkedUser);
        }
        fileStorageService.delete(oldImage);
    }

    private DoctorResponse mapToResponse(Doctor doctor) {
        List<SpecialtyResponse> specialtyResponses = doctor.getSpecialties().stream()
                .map(s -> SpecialtyResponse.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .description(s.getDescription())
                        .branchName(s.getBranchName())
                        .floorLocation(s.getFloorLocation())
                        .headOfDepartment(s.getHeadOfDepartment())
                        .build())
                .collect(Collectors.toList());

        List<DoctorSchedule> schedules = doctorScheduleRepo.findByDoctorId(doctor.getId());
        List<DoctorScheduleDto> scheduleDtos = schedules.stream()
                .map(sch -> DoctorScheduleDto.builder()
                        .id(sch.getId())
                        .dayOfWeek(sch.getDayOfWeek())
                        .startTime(sch.getStartTime())
                        .endTime(sch.getEndTime())
                        .breakStart(sch.getBreakStart())
                        .breakEnd(sch.getBreakEnd())
                        .isAvailable(sch.isAvailable())
                        .build())
                .collect(Collectors.toList());

        List<UnavailableDateResponse> unavailableDates = doctorUnavailableDateRepo
                .findByDoctorIdAndUnavailableDateBetweenOrderByUnavailableDateAsc(
                        doctor.getId(), LocalDate.now(), LocalDate.now().plusMonths(6))
                .stream()
                .map(u -> UnavailableDateResponse.builder()
                        .id(u.getId())
                        .doctorId(doctor.getId())
                        .unavailableDate(u.getUnavailableDate())
                        .reason(u.getReason())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        User linkedUser = doctor.getUser();
        return DoctorResponse.builder()
                .id(doctor.getId())
                .userId(linkedUser != null ? linkedUser.getId() : null)
                .hasAccount(linkedUser != null)
                .accountEmail(linkedUser != null ? linkedUser.getEmail() : null)
                .name(doctor.getName())
                .email(doctor.getEmail())
                .phone(doctor.getPhone())
                .gender(doctor.getGender())
                .profileImage(doctor.getProfileImage())
                .licenseNumber(doctor.getLicenseNumber())
                .bio(doctor.getBio())
                .qualifications(doctor.getQualifications())
                .experienceYears(doctor.getExperienceYears())
                .consultationFee(doctor.getConsultationFee())
                .address(doctor.getAddress())
                .branchName(doctor.getBranchName() != null && !doctor.getBranchName().isBlank()
                        ? doctor.getBranchName()
                        : "MundulCare Main Campus (Phnom Penh)")
                .appointmentDurationMinutes(doctor.getAppointmentDurationMinutes() != null ? doctor.getAppointmentDurationMinutes() : 30)
                .isActive(doctor.isActive())
                .specialties(specialtyResponses)
                .schedules(scheduleDtos)
                .unavailableDates(unavailableDates)
                .build();
    }
}
