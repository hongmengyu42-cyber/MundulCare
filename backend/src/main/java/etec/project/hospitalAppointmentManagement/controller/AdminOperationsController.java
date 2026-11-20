package etec.project.hospitalAppointmentManagement.controller;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import etec.project.hospitalAppointmentManagement.Repo.*;
import etec.project.hospitalAppointmentManagement.Service.AuditLogService;
import etec.project.hospitalAppointmentManagement.dto.response.ApiResponse;
import etec.project.hospitalAppointmentManagement.entity.*;
import etec.project.hospitalAppointmentManagement.enums.AuthProvider;
import etec.project.hospitalAppointmentManagement.enums.Gender;
import etec.project.hospitalAppointmentManagement.enums.Role;
import etec.project.hospitalAppointmentManagement.exception.NotFound;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Operations", description = "Admin endpoints for Patients, Staff, Branches/Locations, and Role & Permission Management")
public class AdminOperationsController {

    private final UserRepo userRepo;
    private final PatientMedicalProfileRepo medicalProfileRepo;
    private final AppointmentRepo appointmentRepo;
    private final StaffRepo staffRepo;
    private final HospitalBranchRepo branchRepo;
    private final DoctorRepo doctorRepo;
    private final NotificationRepo notificationRepo;
    private final OtpRepo otpRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private static final String DEFAULT_ALL_PERMISSIONS =
            "MANAGE_PATIENTS,MANAGE_DOCTORS,MANAGE_STAFF,MANAGE_DEPARTMENTS,MANAGE_BRANCHES,MANAGE_APPOINTMENTS,MANAGE_ROLES,VIEW_AUDIT_LOGS,MANAGE_SETTINGS";

    // =========================================================================
    // 1. PATIENT MANAGEMENT (/api/admin/patients)
    // =========================================================================

    @GetMapping("/patients")
    @Operation(summary = "List all registered patients with medical profile & appointment metrics")
    public ResponseEntity<ApiResponse<List<AdminPatientDto>>> getAllPatients() {
        List<User> patients = userRepo.findByRoleOrderByCreatedAtDesc(Role.PATIENT);
        List<AdminPatientDto> result = patients.stream()
                .map(this::mapPatientToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Patients retrieved successfully", result));
    }

    @PostMapping("/patients")
    @Transactional
    @Operation(summary = "Register a new patient from Admin Portal")
    public ResponseEntity<ApiResponse<AdminPatientDto>> createPatient(
            Authentication auth,
            @Valid @RequestBody AdminPatientRequest req
    ) {
        String email = req.getEmail().trim().toLowerCase();
        if (userRepo.existsByEmail(email)) {
            throw new RuntimeException("An account already exists with email: " + email);
        }

        String rawPassword = (req.getPassword() != null && !req.getPassword().isBlank())
                ? req.getPassword().trim()
                : "Patient@123";

        User admin = getCurrentAdmin(auth);
        String targetBranch = (!isGlobalSuperAdmin(admin) && admin.getAssignedBranch() != null)
                ? admin.getAssignedBranch()
                : (req.getAssignedBranch() != null ? req.getAssignedBranch() : "MundulCare Main Campus (Phnom Penh)");

        User patient = User.builder()
                .name(req.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .phone(req.getPhone() != null ? req.getPhone().trim() : null)
                .role(Role.PATIENT)
                .authProvider(AuthProvider.LOCAL)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .isVerified(true)
                .assignedBranch(targetBranch)
                .build();
        patient = userRepo.save(patient);

        upsertMedicalProfile(patient, req);

        auditLogService.log(
                admin,
                "CREATED_PATIENT",
                "PATIENT",
                patient.getId(),
                "Registered patient '" + patient.getName() + "' (" + patient.getEmail() + ")"
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient registered successfully", mapPatientToDto(patient)));
    }

    @PutMapping("/patients/{id}")
    @Transactional
    @Operation(summary = "Update patient personal & medical profile")
    public ResponseEntity<ApiResponse<AdminPatientDto>> updatePatient(
            Authentication auth,
            @PathVariable Long id,
            @Valid @RequestBody AdminPatientRequest req
    ) {
        User patient = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + id));

        patient.setName(req.getName().trim());
        patient.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        if (req.getIsActive() != null) {
            patient.setActive(req.getIsActive());
        }
        if (req.getAssignedBranch() != null) {
            patient.setAssignedBranch(req.getAssignedBranch());
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            patient.setPassword(passwordEncoder.encode(req.getPassword().trim()));
        }
        patient = userRepo.save(patient);

        upsertMedicalProfile(patient, req);

        User admin = getCurrentAdmin(auth);
        auditLogService.log(
                admin,
                "UPDATED_PATIENT",
                "PATIENT",
                patient.getId(),
                "Updated patient record for '" + patient.getName() + "' (" + patient.getEmail() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Patient updated successfully", mapPatientToDto(patient)));
    }

    @DeleteMapping("/patients/{id}")
    @Transactional
    @Operation(summary = "Deactivate or remove a patient")
    public ResponseEntity<ApiResponse<String>> deletePatient(
            Authentication auth,
            @PathVariable Long id
    ) {
        User patient = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("Patient not found with ID: " + id));

        // Soft-deactivate if patient has appointment history; otherwise allow clean removal
        List<Appointment> apts = appointmentRepo.findByPatientUserIdOrderByAppointmentDateDescStartTimeDesc(id);
        User admin = getCurrentAdmin(auth);
        if (!apts.isEmpty()) {
            patient.setActive(false);
            userRepo.save(patient);
            auditLogService.log(
                    admin,
                    "UPDATED_PATIENT",
                    "PATIENT",
                    patient.getId(),
                    "Deactivated patient '" + patient.getName() + "' (preserved " + apts.size() + " appointment records)"
            );
            return ResponseEntity.ok(ApiResponse.success("Patient has existing appointments and was deactivated to preserve clinical history."));
        }

        medicalProfileRepo.findByUserId(id).ifPresent(medicalProfileRepo::delete);
        userRepo.delete(patient);
        auditLogService.log(
                admin,
                "DELETED_PATIENT",
                "PATIENT",
                id,
                "Deleted patient '" + patient.getName() + "' (" + patient.getEmail() + ")"
        );
        return ResponseEntity.ok(ApiResponse.success("Patient removed successfully"));
    }

    private void upsertMedicalProfile(User patient, AdminPatientRequest req) {
        PatientMedicalProfile profile = medicalProfileRepo.findByUserId(patient.getId())
                .orElseGet(() -> PatientMedicalProfile.builder().user(patient).build());

        profile.setGender(req.getGender());
        profile.setDateOfBirth(req.getDateOfBirth());
        profile.setBloodType(req.getBloodType());
        profile.setAllergies(req.getAllergies());
        profile.setChronicConditions(req.getChronicConditions());
        profile.setEmergencyContactName(req.getEmergencyContactName());
        profile.setEmergencyContactPhone(req.getEmergencyContactPhone());
        medicalProfileRepo.save(profile);
    }

    private AdminPatientDto mapPatientToDto(User u) {
        Optional<PatientMedicalProfile> profileOpt = medicalProfileRepo.findByUserId(u.getId());
        int appointmentCount = appointmentRepo
                .findByPatientUserIdOrderByAppointmentDateDescStartTimeDesc(u.getId())
                .size();
        boolean isLocked = u.getLockTime() != null && u.getLockTime().isAfter(LocalDateTime.now());

        PatientMedicalProfile p = profileOpt.orElse(null);
        return AdminPatientDto.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .profileImage(u.getProfileImage())
                .isActive(u.isActive())
                .isVerified(u.isVerified())
                .isLocked(isLocked)
                .assignedBranch(u.getAssignedBranch() != null ? u.getAssignedBranch() : "MundulCare Main Campus (Phnom Penh)")
                .gender(p != null ? p.getGender() : null)
                .dateOfBirth(p != null ? p.getDateOfBirth() : null)
                .bloodType(p != null ? p.getBloodType() : null)
                .allergies(p != null ? p.getAllergies() : null)
                .chronicConditions(p != null ? p.getChronicConditions() : null)
                .emergencyContactName(p != null ? p.getEmergencyContactName() : null)
                .emergencyContactPhone(p != null ? p.getEmergencyContactPhone() : null)
                .appointmentCount(appointmentCount)
                .createdAt(u.getCreatedAt())
                .build();
    }

    // =========================================================================
    // 2. STAFF MANAGEMENT (/api/admin/staff)
    // =========================================================================

    @GetMapping("/staff")
    @Operation(summary = "List all hospital staff members")
    public ResponseEntity<ApiResponse<List<Staff>>> getAllStaff() {
        List<Staff> staffList = staffRepo.findAll().stream()
                .sorted(Comparator.comparing(Staff::getId).reversed())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Hospital staff retrieved successfully", staffList));
    }

    @PostMapping("/staff")
    @Transactional
    @Operation(summary = "Add a new hospital staff member")
    public ResponseEntity<ApiResponse<Staff>> createStaff(
            Authentication auth,
            @Valid @RequestBody StaffRequest req
    ) {
        String empId = req.getEmployeeId().trim().toUpperCase();
        if (staffRepo.existsByEmployeeId(empId)) {
            throw new RuntimeException("Employee ID already exists: " + empId);
        }
        String email = req.getEmail().trim().toLowerCase();
        if (staffRepo.existsByEmail(email)) {
            throw new RuntimeException("Staff email already exists: " + email);
        }

        User admin = getCurrentAdmin(auth);
        String targetBranch = (!isGlobalSuperAdmin(admin) && admin.getAssignedBranch() != null)
                ? admin.getAssignedBranch()
                : (req.getBranchName() != null ? req.getBranchName() : "MundulCare Main Campus (Phnom Penh)");

        Staff staff = Staff.builder()
                .employeeId(empId)
                .name(req.getName().trim())
                .email(email)
                .phone(req.getPhone())
                .gender(req.getGender())
                .staffRole(req.getStaffRole())
                .departmentName(req.getDepartmentName())
                .branchName(targetBranch)
                .shift(req.getShift() != null ? req.getShift() : "MORNING")
                .joiningDate(req.getJoiningDate() != null ? req.getJoiningDate() : LocalDate.now())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .notes(req.getNotes())
                .build();

        staff = staffRepo.save(staff);

        auditLogService.log(
                admin,
                "CREATED_STAFF",
                "STAFF",
                staff.getId(),
                "Added staff member '" + staff.getName() + "' (" + staff.getStaffRole() + ") at " + staff.getBranchName()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Staff member created successfully", staff));
    }

    @PutMapping("/staff/{id}")
    @Transactional
    @Operation(summary = "Update a hospital staff member")
    public ResponseEntity<ApiResponse<Staff>> updateStaff(
            Authentication auth,
            @PathVariable Long id,
            @Valid @RequestBody StaffRequest req
    ) {
        Staff staff = staffRepo.findById(id)
                .orElseThrow(() -> new NotFound("Staff member not found with ID: " + id));

        String empId = req.getEmployeeId().trim().toUpperCase();
        if (!staff.getEmployeeId().equalsIgnoreCase(empId) && staffRepo.existsByEmployeeId(empId)) {
            throw new RuntimeException("Employee ID already belongs to another staff member: " + empId);
        }
        String email = req.getEmail().trim().toLowerCase();
        if (!staff.getEmail().equalsIgnoreCase(email) && staffRepo.existsByEmail(email)) {
            throw new RuntimeException("Email already belongs to another staff member: " + email);
        }

        staff.setEmployeeId(empId);
        staff.setName(req.getName().trim());
        staff.setEmail(email);
        staff.setPhone(req.getPhone());
        staff.setGender(req.getGender());
        staff.setStaffRole(req.getStaffRole());
        staff.setDepartmentName(req.getDepartmentName());
        staff.setBranchName(req.getBranchName());
        staff.setShift(req.getShift());
        staff.setJoiningDate(req.getJoiningDate());
        if (req.getIsActive() != null) {
            staff.setActive(req.getIsActive());
        }
        staff.setNotes(req.getNotes());

        staff = staffRepo.save(staff);

        User admin = getCurrentAdmin(auth);
        auditLogService.log(
                admin,
                "UPDATED_STAFF",
                "STAFF",
                staff.getId(),
                "Updated staff member '" + staff.getName() + "' (" + staff.getEmployeeId() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Staff member updated successfully", staff));
    }

    @DeleteMapping("/staff/{id}")
    @Transactional
    @Operation(summary = "Remove a hospital staff member")
    public ResponseEntity<ApiResponse<String>> deleteStaff(
            Authentication auth,
            @PathVariable Long id
    ) {
        Staff staff = staffRepo.findById(id)
                .orElseThrow(() -> new NotFound("Staff member not found with ID: " + id));

        staffRepo.delete(staff);

        User admin = getCurrentAdmin(auth);
        auditLogService.log(
                admin,
                "DELETED_STAFF",
                "STAFF",
                id,
                "Removed staff member '" + staff.getName() + "' (" + staff.getEmployeeId() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Staff member removed successfully"));
    }

    // =========================================================================
    // 3. BRANCH & LOCATION MANAGEMENT (/api/admin/branches)
    // =========================================================================

    @GetMapping("/branches")
    @Operation(summary = "List all hospital branches and clinic locations")
    public ResponseEntity<ApiResponse<List<HospitalBranch>>> getAllBranches() {
        List<HospitalBranch> branches = branchRepo.findAll().stream()
                .sorted(Comparator.comparing(HospitalBranch::isMainCampus).reversed()
                        .thenComparing(HospitalBranch::getId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Hospital branches retrieved successfully", branches));
    }

    @PostMapping("/branches")
    @Transactional
    @Operation(summary = "Create a new hospital branch or clinic location")
    public ResponseEntity<ApiResponse<HospitalBranch>> createBranch(
            Authentication auth,
            @Valid @RequestBody BranchRequest req
    ) {
        User admin = getCurrentAdmin(auth);
        requireGlobalAdmin(admin, "create new hospital branches");

        String code = req.getCode().trim().toUpperCase();
        if (branchRepo.existsByCode(code)) {
            throw new RuntimeException("Branch code already exists: " + code);
        }

        HospitalBranch branch = HospitalBranch.builder()
                .code(code)
                .name(req.getName().trim())
                .city(req.getCity().trim())
                .address(req.getAddress().trim())
                .phone(req.getPhone())
                .email(req.getEmail())
                .operatingHours(req.getOperatingHours())
                .managerName(req.getManagerName())
                .isMainCampus(req.getIsMainCampus() != null && req.getIsMainCampus())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        branch = branchRepo.save(branch);

        auditLogService.log(
                admin,
                "CREATED_BRANCH",
                "BRANCH",
                branch.getId(),
                "Created hospital branch '" + branch.getName() + "' (" + branch.getCode() + ")"
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Hospital branch created successfully", branch));
    }

    @PutMapping("/branches/{id}")
    @Transactional
    @Operation(summary = "Update a hospital branch or location")
    public ResponseEntity<ApiResponse<HospitalBranch>> updateBranch(
            Authentication auth,
            @PathVariable Long id,
            @Valid @RequestBody BranchRequest req
    ) {
        HospitalBranch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFound("Hospital branch not found with ID: " + id));

        String code = req.getCode().trim().toUpperCase();
        if (!branch.getCode().equalsIgnoreCase(code) && branchRepo.existsByCode(code)) {
            throw new RuntimeException("Branch code already exists: " + code);
        }

        branch.setCode(code);
        branch.setName(req.getName().trim());
        branch.setCity(req.getCity().trim());
        branch.setAddress(req.getAddress().trim());
        branch.setPhone(req.getPhone());
        branch.setEmail(req.getEmail());
        branch.setOperatingHours(req.getOperatingHours());
        branch.setManagerName(req.getManagerName());
        if (req.getIsMainCampus() != null) {
            branch.setMainCampus(req.getIsMainCampus());
        }
        if (req.getIsActive() != null) {
            branch.setActive(req.getIsActive());
        }

        branch = branchRepo.save(branch);

        User admin = getCurrentAdmin(auth);
        auditLogService.log(
                admin,
                "UPDATED_BRANCH",
                "BRANCH",
                branch.getId(),
                "Updated hospital branch '" + branch.getName() + "' (" + branch.getCode() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Hospital branch updated successfully", branch));
    }

    @DeleteMapping("/branches/{id}")
    @Transactional
    @Operation(summary = "Delete a hospital branch")
    public ResponseEntity<ApiResponse<String>> deleteBranch(
            Authentication auth,
            @PathVariable Long id
    ) {
        User admin = getCurrentAdmin(auth);
        requireGlobalAdmin(admin, "delete hospital branches");

        HospitalBranch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFound("Hospital branch not found with ID: " + id));

        if (branch.isMainCampus()) {
            throw new RuntimeException("The primary Main Campus branch cannot be deleted.");
        }

        branchRepo.delete(branch);

        auditLogService.log(
                admin,
                "DELETED_BRANCH",
                "BRANCH",
                id,
                "Deleted hospital branch '" + branch.getName() + "' (" + branch.getCode() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Hospital branch deleted successfully"));
    }

    @DeleteMapping("/branches/{id}/director")
    @Transactional
    @Operation(summary = "Remove or unassign the Branch Director from a hospital branch")
    public ResponseEntity<ApiResponse<HospitalBranch>> removeBranchDirector(
            Authentication auth,
            @PathVariable Long id
    ) {
        User admin = getCurrentAdmin(auth);
        requireGlobalAdmin(admin, "remove or reassign hospital branch directors");

        HospitalBranch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFound("Hospital branch not found with ID: " + id));

        String oldDirector = branch.getManagerName();
        branch.setManagerName(null);
        branch = branchRepo.save(branch);

        auditLogService.log(
                admin,
                "REMOVED_BRANCH_DIRECTOR",
                "BRANCH",
                branch.getId(),
                "Removed Branch Director '" + oldDirector + "' from " + branch.getName()
        );

        return ResponseEntity.ok(ApiResponse.success("Branch director removed successfully", branch));
    }

    // =========================================================================
    // 4. ROLE, PERMISSION & ADMIN PRIVILEGE MANAGEMENT (/api/admin/users)
    // =========================================================================

    @GetMapping("/users")
    @Operation(summary = "List all system accounts with roles, branch assignments, and administrative privileges")
    public ResponseEntity<ApiResponse<List<AdminUserAccountDto>>> getAllUsers() {
        List<User> users = userRepo.findAllByOrderByCreatedAtDesc();
        List<AdminUserAccountDto> dtos = users.stream()
                .map(this::mapUserToAccountDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("System users retrieved successfully", dtos));
    }

    @PostMapping("/users")
    @Transactional
    @Operation(summary = "Create a new administrator or system user with specific role, branch, and permissions")
    public ResponseEntity<ApiResponse<AdminUserAccountDto>> createAdminOrUser(
            Authentication auth,
            @Valid @RequestBody CreateAdminUserRequest req
    ) {
        User admin = getCurrentAdmin(auth);
        requireGlobalAdmin(admin, "create or assign Branch Administrators and system roles");

        String email = req.getEmail().trim().toLowerCase();
        if (userRepo.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered: " + email);
        }

        Role role = req.getRole() != null ? req.getRole() : Role.ADMIN;
        String adminLevel = role == Role.ADMIN
                ? (req.getAdminLevel() != null ? req.getAdminLevel() : "BRANCH_ADMIN")
                : null;
        String assignedBranch = req.getAssignedBranch() != null && !req.getAssignedBranch().isBlank()
                ? req.getAssignedBranch()
                : (role == Role.ADMIN ? "All Branches (Global)" : "MundulCare Main Campus (Phnom Penh)");
        String permissions = role == Role.ADMIN
                ? (req.getPermissions() != null && !req.getPermissions().isBlank()
                        ? req.getPermissions()
                        : DEFAULT_ALL_PERMISSIONS)
                : null;

        User created = User.builder()
                .name(req.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(req.getPassword().trim()))
                .phone(req.getPhone())
                .role(role)
                .authProvider(AuthProvider.LOCAL)
                .isActive(true)
                .isVerified(true)
                .adminLevel(adminLevel)
                .assignedBranch(assignedBranch)
                .permissions(permissions)
                .build();

        created = userRepo.save(created);

        auditLogService.log(
                admin,
                "CREATED_USER_ROLE",
                "USER",
                created.getId(),
                "Created " + role + (adminLevel != null ? " [" + adminLevel + "]" : "") + " account for '" + created.getName() + "' (" + created.getEmail() + ") — Branch: " + assignedBranch
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User account created successfully", mapUserToAccountDto(created)));
    }

    @PutMapping("/users/{id}/privileges")
    @Transactional
    @Operation(summary = "Update user role, administrative tier, branch assignment, password, and granular permissions")
    public ResponseEntity<ApiResponse<AdminUserAccountDto>> updateUserPrivileges(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody UpdatePrivilegesRequest req
    ) {
        User currentAdmin = getCurrentAdmin(auth);
        requireGlobalAdmin(currentAdmin, "modify administrator roles, branch assignments, or privileges");

        User target = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("User not found with ID: " + id));

        if (currentAdmin != null && currentAdmin.getId().equals(target.getId())) {
            if (req.getRole() != null && req.getRole() != Role.ADMIN) {
                throw new RuntimeException("You cannot demote your own active administrator account.");
            }
            if (req.getIsActive() != null && !req.getIsActive()) {
                throw new RuntimeException("You cannot deactivate your own active administrator account.");
            }
        }

        if (req.getName() != null && !req.getName().isBlank()) {
            target.setName(req.getName().trim());
        }
        if (req.getPhone() != null) {
            target.setPhone(req.getPhone().trim());
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            target.setPassword(passwordEncoder.encode(req.getPassword().trim()));
        }
        if (req.getRole() != null) {
            target.setRole(req.getRole());
        }
        if (target.getRole() == Role.ADMIN) {
            target.setAdminLevel(req.getAdminLevel() != null ? req.getAdminLevel() : "SUPER_ADMIN");
            target.setAssignedBranch(req.getAssignedBranch() != null ? req.getAssignedBranch() : "All Branches (Global)");
            target.setPermissions(req.getPermissions() != null ? req.getPermissions() : DEFAULT_ALL_PERMISSIONS);
        } else {
            target.setAdminLevel(null);
            target.setPermissions(null);
            if (req.getAssignedBranch() != null) {
                target.setAssignedBranch(req.getAssignedBranch());
            }
        }

        if (req.getIsActive() != null) {
            target.setActive(req.getIsActive());
            if (!req.getIsActive()) {
                target.setLockTime(LocalDateTime.now().plusYears(100));
                target.setFailedLoginAttempts(5);
            } else {
                target.setLockTime(null);
                target.setFailedLoginAttempts(0);
            }
        }

        target = userRepo.save(target);

        auditLogService.log(
                currentAdmin,
                "UPDATED_PRIVILEGES",
                "USER",
                target.getId(),
                "Updated role/privileges for '" + target.getName() + "' (" + target.getEmail() + ") -> Role: " +
                        target.getRole() + (target.getAdminLevel() != null ? " [" + target.getAdminLevel() + "]" : "") +
                        ", Branch: " + target.getAssignedBranch()
        );

        return ResponseEntity.ok(ApiResponse.success("User privileges updated successfully", mapUserToAccountDto(target)));
    }

    @PutMapping("/users/{id}/unlock")
    @Transactional
    @Operation(summary = "Unlock a locked user account and reset failed login attempts")
    public ResponseEntity<ApiResponse<AdminUserAccountDto>> unlockUserAccount(
            Authentication auth,
            @PathVariable Long id
    ) {
        User currentAdmin = getCurrentAdmin(auth);
        requireGlobalAdmin(currentAdmin, "unlock user accounts");

        User target = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("User not found with ID: " + id));

        target.setFailedLoginAttempts(0);
        target.setLockTime(null);
        target.setVerified(true);
        target.setActive(true);
        target = userRepo.save(target);

        auditLogService.log(
                currentAdmin,
                "UPDATED_USER_UNLOCK",
                "USER",
                target.getId(),
                "Unlocked & verified account for '" + target.getName() + "' (" + target.getEmail() + ")"
        );

        return ResponseEntity.ok(ApiResponse.success("Account unlocked successfully", mapUserToAccountDto(target)));
    }

    @PutMapping("/users/{id}/lock")
    @Transactional
    @Operation(summary = "Lock any user account (branch admin, director, doctor, patient) preventing login")
    public ResponseEntity<ApiResponse<AdminUserAccountDto>> lockUserAccount(
            Authentication auth,
            @PathVariable Long id
    ) {
        User currentAdmin = getCurrentAdmin(auth);
        requireGlobalAdmin(currentAdmin, "lock user accounts or administrators");

        User target = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("User not found with ID: " + id));

        if (currentAdmin != null && currentAdmin.getId().equals(target.getId())) {
            throw new RuntimeException("You cannot lock your own active administrator account.");
        }

        // Lock for 100 years, set inactive, and set failed attempts
        target.setActive(false);
        target.setLockTime(LocalDateTime.now().plusYears(100));
        target.setFailedLoginAttempts(5);
        target = userRepo.save(target);

        auditLogService.log(
                currentAdmin,
                "LOCKED_USER",
                "USER",
                target.getId(),
                "Manually locked user account '" + target.getName() + "' (" + target.getEmail() + ") - Role: " + target.getRole()
        );

        return ResponseEntity.ok(ApiResponse.success("Account locked successfully", mapUserToAccountDto(target)));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    @Operation(summary = "Permanently delete or deactivate any user account (patient, doctor, branch admin, director)")
    public ResponseEntity<ApiResponse<String>> deleteUser(
            Authentication auth,
            @PathVariable Long id
    ) {
        User currentAdmin = getCurrentAdmin(auth);
        requireGlobalAdmin(currentAdmin, "delete user accounts and branch administrators");

        User target = userRepo.findById(id)
                .orElseThrow(() -> new NotFound("User not found with ID: " + id));

        if (currentAdmin != null && currentAdmin.getId().equals(target.getId())) {
            throw new RuntimeException("You cannot delete your own active administrator account.");
        }

        // 1. Unlink any doctor record referencing this user account
        doctorRepo.findByUserId(target.getId()).ifPresent(doc -> {
            doc.setUser(null);
            doctorRepo.save(doc);
        });

        // 2. Clean up OTPs and Notifications
        otpRepo.deleteByEmail(target.getEmail());
        notificationRepo.deleteByRecipientUserId(target.getId());

        // 3. Clean up patient medical profile if any
        medicalProfileRepo.findByUserId(target.getId()).ifPresent(medicalProfileRepo::delete);

        // 4. Check if patient has appointment history
        List<Appointment> apts = appointmentRepo.findByPatientUserIdOrderByAppointmentDateDescStartTimeDesc(target.getId());
        if (!apts.isEmpty()) {
            target.setActive(false);
            target.setLockTime(LocalDateTime.now().plusYears(100));
            userRepo.save(target);
            auditLogService.log(
                    currentAdmin,
                    "DEACTIVATED_USER",
                    "USER",
                    target.getId(),
                    "Deactivated & locked user '" + target.getName() + "' (" + target.getEmail() + ") to preserve clinical history"
            );
            return ResponseEntity.ok(ApiResponse.success("User account deactivated and permanently locked to preserve clinical records."));
        }

        userRepo.delete(target);
        auditLogService.log(
                currentAdmin,
                "DELETED_USER",
                "USER",
                id,
                "Permanently deleted user account '" + target.getName() + "' (" + target.getEmail() + ") with role " + target.getRole()
        );

        return ResponseEntity.ok(ApiResponse.success("User account deleted successfully"));
    }

    private AdminUserAccountDto mapUserToAccountDto(User u) {
        boolean isLocked = u.getLockTime() != null && u.getLockTime().isAfter(LocalDateTime.now());
        String adminLevel = u.getRole() == Role.ADMIN
                ? (u.getAdminLevel() != null ? u.getAdminLevel() : "SUPER_ADMIN")
                : null;
        String branch = u.getAssignedBranch() != null
                ? u.getAssignedBranch()
                : (u.getRole() == Role.ADMIN ? "All Branches (Global)" : "MundulCare Main Campus (Phnom Penh)");
        String perms = u.getRole() == Role.ADMIN
                ? (u.getPermissions() != null && !u.getPermissions().isBlank() ? u.getPermissions() : DEFAULT_ALL_PERMISSIONS)
                : "";

        return AdminUserAccountDto.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .profileImage(u.getProfileImage())
                .role(u.getRole())
                .authProvider(u.getAuthProvider())
                .isActive(u.isActive())
                .isVerified(u.isVerified())
                .isLocked(isLocked)
                .failedLoginAttempts(u.getFailedLoginAttempts())
                .adminLevel(adminLevel)
                .assignedBranch(branch)
                .permissions(perms)
                .createdAt(u.getCreatedAt())
                .build();
    }

    private User getCurrentAdmin(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        return userRepo.findByEmail(auth.getName()).orElse(null);
    }

    private boolean isGlobalSuperAdmin(User admin) {
        if (admin == null) return true;
        String level = admin.getAdminLevel();
        String branch = admin.getAssignedBranch();
        if (level == null || "SUPER_ADMIN".equalsIgnoreCase(level)) return true;
        return branch == null || "All Branches (Global)".equalsIgnoreCase(branch);
    }

    private void requireGlobalAdmin(User admin, String actionDescription) {
        if (!isGlobalSuperAdmin(admin)) {
            throw new RuntimeException("Access Denied: Only a Global Admin can " + actionDescription +
                    ". Your account is scoped to '" + admin.getAssignedBranch() + "'.");
        }
    }

    // =========================================================================
    // DTO CLASSES
    // =========================================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminPatientDto {
        private Long id;
        private String name;
        private String email;
        private String phone;
        private String profileImage;
        @JsonProperty("isActive")
        private boolean isActive;
        @JsonProperty("isVerified")
        private boolean isVerified;
        @JsonProperty("isLocked")
        private boolean isLocked;
        private String assignedBranch;
        private Gender gender;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate dateOfBirth;
        private String bloodType;
        private String allergies;
        private String chronicConditions;
        private String emergencyContactName;
        private String emergencyContactPhone;
        private int appointmentCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminPatientRequest {
        @NotBlank(message = "Patient name is required")
        private String name;
        @NotBlank(message = "Patient email is required")
        @Email(message = "Valid email is required")
        private String email;
        private String phone;
        private String password;
        @JsonProperty("isActive")
        private Boolean isActive;
        private String assignedBranch;
        private Gender gender;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate dateOfBirth;
        private String bloodType;
        private String allergies;
        private String chronicConditions;
        private String emergencyContactName;
        private String emergencyContactPhone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffRequest {
        @NotBlank(message = "Employee ID is required")
        private String employeeId;
        @NotBlank(message = "Staff name is required")
        private String name;
        @NotBlank(message = "Staff email is required")
        @Email(message = "Valid email is required")
        private String email;
        private String phone;
        private Gender gender;
        @NotBlank(message = "Staff role is required")
        private String staffRole;
        private String departmentName;
        private String branchName;
        private String shift;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate joiningDate;
        @JsonProperty("isActive")
        private Boolean isActive;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BranchRequest {
        @NotBlank(message = "Branch code is required")
        private String code;
        @NotBlank(message = "Branch name is required")
        private String name;
        @NotBlank(message = "City/Province is required")
        private String city;
        @NotBlank(message = "Branch address is required")
        private String address;
        private String phone;
        private String email;
        private String operatingHours;
        private String managerName;
        @JsonProperty("isMainCampus")
        private Boolean isMainCampus;
        @JsonProperty("isActive")
        private Boolean isActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminUserAccountDto {
        private Long id;
        private String name;
        private String email;
        private String phone;
        private String profileImage;
        private Role role;
        private AuthProvider authProvider;
        @JsonProperty("isActive")
        private boolean isActive;
        @JsonProperty("isVerified")
        private boolean isVerified;
        @JsonProperty("isLocked")
        private boolean isLocked;
        private int failedLoginAttempts;
        private String adminLevel;
        private String assignedBranch;
        private String permissions;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateAdminUserRequest {
        @NotBlank(message = "Name is required")
        private String name;
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;
        @NotBlank(message = "Temporary password is required")
        private String password;
        private String phone;
        private Role role;
        private String adminLevel;
        private String assignedBranch;
        private String permissions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePrivilegesRequest {
        private String name;
        private String phone;
        private String password;
        private Role role;
        private String adminLevel;
        private String assignedBranch;
        private String permissions;
        @JsonProperty("isActive")
        private Boolean isActive;
    }
}
