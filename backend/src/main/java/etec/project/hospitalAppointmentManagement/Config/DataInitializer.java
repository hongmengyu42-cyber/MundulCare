package etec.project.hospitalAppointmentManagement.Config;

import etec.project.hospitalAppointmentManagement.Repo.DoctorRepo;
import etec.project.hospitalAppointmentManagement.Repo.DoctorScheduleRepo;
import etec.project.hospitalAppointmentManagement.Repo.HospitalBranchRepo;
import etec.project.hospitalAppointmentManagement.Repo.SpecialtyRepo;
import etec.project.hospitalAppointmentManagement.Repo.StaffRepo;
import etec.project.hospitalAppointmentManagement.Repo.UserRepo;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.DoctorSchedule;
import etec.project.hospitalAppointmentManagement.entity.HospitalBranch;
import etec.project.hospitalAppointmentManagement.entity.Specialty;
import etec.project.hospitalAppointmentManagement.entity.Staff;
import etec.project.hospitalAppointmentManagement.entity.User;
import etec.project.hospitalAppointmentManagement.enums.AuthProvider;
import etec.project.hospitalAppointmentManagement.enums.Gender;
import etec.project.hospitalAppointmentManagement.enums.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final SpecialtyRepo specialtyRepo;
    private final DoctorRepo doctorRepo;
    private final DoctorScheduleRepo doctorScheduleRepo;
    private final UserRepo userRepo;
    private final HospitalBranchRepo branchRepo;
    private final StaffRepo staffRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureBranchesStaffAndMetadata();
        seedSpecialtiesAndDoctors();
        ensureDoctorUserAccounts();
    }

    private void ensureBranchesStaffAndMetadata() {
        // 1. Seed Hospital Branches if empty
        if (branchRepo.count() == 0) {
            branchRepo.save(HospitalBranch.builder()
                    .name("MundulCare Main Campus (Phnom Penh)")
                    .code("MC-PNH-01")
                    .city("Phnom Penh")
                    .address("#245 Preah Monivong Blvd, Sangkat Boeung Keng Kang I")
                    .phone("+855 23 999 100")
                    .email("info@mundulcare.com")
                    .operatingHours("24/7 Emergency & Outpatient (07:00 - 20:00)")
                    .managerName("Dr. Sothea Chan")
                    .isMainCampus(true)
                    .isActive(true)
                    .build());

            branchRepo.save(HospitalBranch.builder()
                    .name("MundulCare Siem Reap Branch")
                    .code("MC-SRP-02")
                    .city("Siem Reap")
                    .address("#88 Charles de Gaulle Blvd, Svay Dangkum")
                    .phone("+855 63 999 200")
                    .email("siemreap@mundulcare.com")
                    .operatingHours("Daily (07:30 - 19:30)")
                    .managerName("Dr. Sovannara Kim")
                    .isMainCampus(false)
                    .isActive(true)
                    .build());

            branchRepo.save(HospitalBranch.builder()
                    .name("MundulCare Battambang Medical Center")
                    .code("MC-BTB-03")
                    .city("Battambang")
                    .address("#12 National Road 5, Sangkat Svay Por")
                    .phone("+855 53 999 300")
                    .email("battambang@mundulcare.com")
                    .operatingHours("Mon–Sat (07:30 - 18:00)")
                    .managerName("Dr. Bunroeun Seng")
                    .isMainCampus(false)
                    .isActive(true)
                    .build());
            log.info("Seeded 3 initial Hospital Branches.");
        }

        // 2. Backfill Specialty branch/floor/head metadata
        List<Specialty> specialties = specialtyRepo.findAll();
        boolean allDefaultBranch = specialties.stream().allMatch(
                sp -> sp.getBranchName() == null || sp.getBranchName().isBlank() || "MundulCare Main Campus (Phnom Penh)".equals(sp.getBranchName())
        );
        for (Specialty s : specialties) {
            boolean changed = false;
            if (s.getBranchName() == null || s.getBranchName().isBlank() || allDefaultBranch) {
                switch (s.getName()) {
                    case "Pediatrics", "Dentistry" -> s.setBranchName("MundulCare Siem Reap Branch");
                    case "Orthopedics" -> s.setBranchName("MundulCare Battambang Medical Center");
                    default -> s.setBranchName("MundulCare Main Campus (Phnom Penh)");
                }
                changed = true;
            }
            if (s.getFloorLocation() == null || s.getFloorLocation().isBlank()) {
                switch (s.getName()) {
                    case "Cardiology" -> s.setFloorLocation("Building A · 3rd Floor, East Wing");
                    case "Dermatology" -> s.setFloorLocation("Building B · 1st Floor, Suite 105");
                    case "Pediatrics" -> s.setFloorLocation("Building A · 2nd Floor, Children's Wing");
                    case "Neurology" -> s.setFloorLocation("Building A · 4th Floor, Neuroscience Wing");
                    case "Orthopedics" -> s.setFloorLocation("Building B · 2nd Floor, Joint Clinic");
                    case "Dentistry" -> s.setFloorLocation("Building B · 1st Floor, Dental Suite 110");
                    default -> s.setFloorLocation("Building A · 1st Floor, Outpatient Wing");
                }
                changed = true;
            }
            if (s.getHeadOfDepartment() == null || s.getHeadOfDepartment().isBlank()) {
                switch (s.getName()) {
                    case "Cardiology" -> s.setHeadOfDepartment("Dr. Sovannara Kim");
                    case "Dermatology" -> s.setHeadOfDepartment("Dr. Elena Vance");
                    case "Pediatrics" -> s.setHeadOfDepartment("Dr. Mary Johnson");
                    case "Neurology" -> s.setHeadOfDepartment("Dr. Rithy Chhay");
                    case "Orthopedics" -> s.setHeadOfDepartment("Dr. Bunroeun Seng");
                    case "Dentistry" -> s.setHeadOfDepartment("Dr. Voleak Pich");
                    default -> s.setHeadOfDepartment("Dr. Sothea Chan");
                }
                changed = true;
            }
            if (changed) {
                specialtyRepo.save(s);
            }
        }

        // 2b. Backfill Doctor branch assignments across the 3 branches if missing
        List<Doctor> allDoctors = doctorRepo.findAll();
        for (Doctor d : allDoctors) {
            if (d.getBranchName() == null || d.getBranchName().isBlank()) {
                String docName = d.getName() != null ? d.getName() : "";
                if (docName.contains("Mary Johnson") || docName.contains("Voleak Pich")) {
                    d.setBranchName("MundulCare Siem Reap Branch");
                } else if (docName.contains("Bunroeun Seng")) {
                    d.setBranchName("MundulCare Battambang Medical Center");
                } else {
                    d.setBranchName("MundulCare Main Campus (Phnom Penh)");
                }
                doctorRepo.save(d);
            }
        }

        // 3. Seed Hospital Staff if empty
        if (staffRepo.count() == 0) {
            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-001")
                    .name("Sophea Meas")
                    .email("sopheameas@mundulcare.com")
                    .phone("+855 12 401 101")
                    .gender(Gender.FEMALE)
                    .staffRole("HEAD_NURSE")
                    .departmentName("Cardiology")
                    .branchName("MundulCare Main Campus (Phnom Penh)")
                    .shift("MORNING")
                    .joiningDate(LocalDate.of(2022, 3, 15))
                    .isActive(true)
                    .notes("Charge nurse overseeing ICU & Cardiology outpatient triage.")
                    .build());

            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-002")
                    .name("Dara Vann")
                    .email("daravann@mundulcare.com")
                    .phone("+855 12 402 202")
                    .gender(Gender.MALE)
                    .staffRole("PHARMACIST")
                    .departmentName("General Medicine")
                    .branchName("MundulCare Main Campus (Phnom Penh)")
                    .shift("FULL_DAY")
                    .joiningDate(LocalDate.of(2023, 1, 10))
                    .isActive(true)
                    .notes("Lead Clinical Pharmacist managing central dispensary inventory.")
                    .build());

            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-003")
                    .name("Channary Sok")
                    .email("channarysok@mundulcare.com")
                    .phone("+855 12 403 303")
                    .gender(Gender.FEMALE)
                    .staffRole("RECEPTIONIST")
                    .departmentName("General Medicine")
                    .branchName("MundulCare Main Campus (Phnom Penh)")
                    .shift("MORNING")
                    .joiningDate(LocalDate.of(2024, 6, 1))
                    .isActive(true)
                    .notes("Front-desk patient check-in and queue coordinator.")
                    .build());

            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-004")
                    .name("Piseth Heng")
                    .email("pisethheng@mundulcare.com")
                    .phone("+855 12 404 404")
                    .gender(Gender.MALE)
                    .staffRole("LAB_TECHNICIAN")
                    .departmentName("Neurology")
                    .branchName("MundulCare Siem Reap Branch")
                    .shift("FULL_DAY")
                    .joiningDate(LocalDate.of(2023, 8, 20))
                    .isActive(true)
                    .notes("Diagnostic imaging & hematology pathology specialist.")
                    .build());

            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-005")
                    .name("Bopha Keo")
                    .email("bophakeo@mundulcare.com")
                    .phone("+855 12 405 505")
                    .gender(Gender.FEMALE)
                    .staffRole("REGISTERED_NURSE")
                    .departmentName("Pediatrics")
                    .branchName("MundulCare Siem Reap Branch")
                    .shift("AFTERNOON")
                    .joiningDate(LocalDate.of(2024, 2, 12))
                    .isActive(true)
                    .notes("Pediatric immunization & child wellness nurse.")
                    .build());

            staffRepo.save(Staff.builder()
                    .employeeId("STF-2026-006")
                    .name("Vireak Lim")
                    .email("vireaklim@mundulcare.com")
                    .phone("+855 12 406 606")
                    .gender(Gender.MALE)
                    .staffRole("CARE_COORDINATOR")
                    .departmentName("Orthopedics")
                    .branchName("MundulCare Battambang Medical Center")
                    .shift("FULL_DAY")
                    .joiningDate(LocalDate.of(2023, 11, 5))
                    .isActive(true)
                    .notes("Coordinates outpatient physiotherapy rooms and clinic operations.")
                    .build());
            log.info("Seeded 6 initial Hospital Staff records.");
        }

        // 3b. Seed dedicated Branch Admin accounts for each Hospital Branch if not already present
        seedBranchAdminIfMissing(
                "Phnom Penh Branch Admin",
                "admin.pnh@mundulcare.com",
                "+855 23 999 101",
                "MundulCare Main Campus (Phnom Penh)"
        );
        seedBranchAdminIfMissing(
                "Siem Reap Branch Admin",
                "admin.srp@mundulcare.com",
                "+855 63 999 201",
                "MundulCare Siem Reap Branch"
        );
        seedBranchAdminIfMissing(
                "Battambang Branch Admin",
                "admin.btb@mundulcare.com",
                "+855 53 999 301",
                "MundulCare Battambang Medical Center"
        );

        // 4. Ensure all ADMIN users have default administrative privilege metadata
        List<User> admins = userRepo.findByRoleOrderByCreatedAtDesc(Role.ADMIN);
        for (User admin : admins) {
            boolean updated = false;
            if (admin.getAdminLevel() == null || admin.getAdminLevel().isBlank()) {
                admin.setAdminLevel("SUPER_ADMIN");
                updated = true;
            }
            if (admin.getAssignedBranch() == null || admin.getAssignedBranch().isBlank()) {
                admin.setAssignedBranch("All Branches (Global)");
                updated = true;
            }
            if (admin.getPermissions() == null || admin.getPermissions().isBlank()) {
                admin.setPermissions("MANAGE_PATIENTS,MANAGE_DOCTORS,MANAGE_STAFF,MANAGE_DEPARTMENTS,MANAGE_BRANCHES,MANAGE_APPOINTMENTS,MANAGE_ROLES,VIEW_AUDIT_LOGS,MANAGE_SETTINGS");
                updated = true;
            }
            if (updated) {
                userRepo.save(admin);
            }
        }
    }

    private void seedBranchAdminIfMissing(String name, String email, String phone, String branchName) {
        if (userRepo.findByEmail(email).isEmpty()) {
            userRepo.save(User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode("Admin@123"))
                    .phone(phone)
                    .role(Role.ADMIN)
                    .authProvider(AuthProvider.LOCAL)
                    .isVerified(true)
                    .adminLevel("BRANCH_ADMIN")
                    .assignedBranch(branchName)
                    .permissions("MANAGE_PATIENTS,MANAGE_DOCTORS,MANAGE_STAFF,MANAGE_DEPARTMENTS,MANAGE_APPOINTMENTS,VIEW_AUDIT_LOGS")
                    .build());
            log.info("Provisioned BRANCH_ADMIN account for {} ({})", branchName, email);
        }
    }

    private void ensureDoctorUserAccounts() {
        List<Doctor> doctors = doctorRepo.findAll();
        for (Doctor doc : doctors) {
            boolean updated = false;
            if (doc.getAppointmentDurationMinutes() == null) {
                doc.setAppointmentDurationMinutes(30);
                updated = true;
            }
            if (doc.getQualifications() == null || doc.getQualifications().isBlank()) {
                doc.setQualifications("MD, Board Certified Specialist — Royal University of Health Sciences");
                updated = true;
            }
            if (doc.getGender() == null) {
                String lower = doc.getName() != null ? doc.getName().toLowerCase() : "";
                doc.setGender((lower.contains("elena") || lower.contains("voleak") || lower.contains("mary"))
                        ? Gender.FEMALE : Gender.MALE);
                updated = true;
            }
            if (doc.getUser() == null && doc.getEmail() != null && !doc.getEmail().isBlank()) {
                String email = doc.getEmail().trim();
                Optional<User> existingUserOpt = userRepo.findByEmail(email);
                User account;
                if (existingUserOpt.isPresent()) {
                    account = existingUserOpt.get();
                    if (account.getRole() != Role.ADMIN) {
                        account.setRole(Role.DOCTOR);
                        account.setVerified(true);
                        account = userRepo.save(account);
                        doc.setUser(account);
                        updated = true;
                    }
                } else {
                    account = userRepo.save(User.builder()
                            .name(doc.getName())
                            .email(email)
                            .password(passwordEncoder.encode("Doctor@123"))
                            .phone(doc.getPhone())
                            .profileImage(doc.getProfileImage())
                            .role(Role.DOCTOR)
                            .authProvider(AuthProvider.LOCAL)
                            .isVerified(true)
                            .build());
                    doc.setUser(account);
                    updated = true;
                    log.info("Provisioned DOCTOR login account for {} ({})", doc.getName(), email);
                }
            }
            if (updated) {
                doctorRepo.save(doc);
            }
        }
    }

    private void seedSpecialtiesAndDoctors() {
        // 1. Ensure all core Specialties exist
        Specialty cardiology = getOrCreateSpecialty("Cardiology", "Heart and cardiovascular health, hypertension, chest tightness, and circulation.");
        Specialty dermatology = getOrCreateSpecialty("Dermatology", "Skin, hair, nails, eczema, acne, rashes, and allergic reactions.");
        Specialty pediatrics = getOrCreateSpecialty("Pediatrics", "Comprehensive medical care for infants, children, and adolescents.");
        Specialty neurology = getOrCreateSpecialty("Neurology", "Brain, spinal cord, nerves, chronic migraines, severe headaches, and dizziness.");
        Specialty orthopedics = getOrCreateSpecialty("Orthopedics", "Bones, joints, ligaments, fractures, back pain, knee stiffness, and sports injuries.");
        Specialty dentistry = getOrCreateSpecialty("Dentistry", "Oral health, toothache, teeth cleaning, cavity filling, root canal, and gum care.");
        Specialty general = getOrCreateSpecialty("General Medicine", "Primary healthcare, fever, flu, cold, sneezing, stomach ache, fatigue, and general health.");

        final String PNH_BRANCH = "MundulCare Main Campus (Phnom Penh)";
        final String SRP_BRANCH = "MundulCare Siem Reap Branch";
        final String BTB_BRANCH = "MundulCare Battambang Medical Center";

        // =========================================================================
        // Branch 1: MundulCare Main Campus (Phnom Penh) — All 7 Specialties
        // =========================================================================
        upsertDoctor("Dr. Sothea Chan", "sotheachan_mundulcare@mmprojectstar.com", "+855 12 100 200", "MD-KH-2018-010",
                "Lead Family Physician & Outpatient Primary Care Director. Expert in comprehensive preventive checkups, seasonal infections, chronic hypertension management, and adult internal medicine.",
                "MD, Internal & Family Medicine — Royal University of Health Sciences",
                14, 25.00, "Room 101, Primary Outpatient Wing, Building A", PNH_BRANCH, Gender.MALE, Set.of(general));

        upsertDoctor("Dr. Sovannara Kim", "sovannarakim_mundulcare@mmprojectstar.com", "+855 12 111 222", "MD-KH-2021-042",
                "Senior Cardiologist & Cardiovascular Health Consultant. Specializes in ECG diagnostics, echocardiography, blood pressure control, and coronary artery disease prevention.",
                "MD, Cardiology Fellow — Paris Descartes University & RUHS",
                12, 35.00, "Room 301, Cardiology Department, Building A", PNH_BRANCH, Gender.MALE, Set.of(cardiology));

        upsertDoctor("Dr. Elena Vance", "elenavance_mundulcare@mmprojectstar.com", "+855 12 333 444", "MD-KH-2023-118",
                "Consultant Dermatologist & Allergy Specialist. Focuses on clinical dermatology, acute eczema, contact dermatitis, laser skin treatments, and autoimmune skin disorders.",
                "MD, Board Certified Dermatologist — Johns Hopkins Medicine Fellowship",
                8, 28.00, "Room 105, Skin & Allergy Center, Building B", PNH_BRANCH, Gender.FEMALE, Set.of(dermatology));

        upsertDoctor("Dr. Rithy Chhay", "rithychhay_mundulcare@mmprojectstar.com", "+855 12 555 666", "MD-KH-2019-089",
                "Chief Neurologist specializing in chronic migraine therapies, neurological tremors, vestibular dizziness, peripheral neuropathy, and stroke recovery.",
                "MD, PhD in Clinical Neurology — Mahidol University",
                15, 45.00, "Room 402, Neuroscience Wing, Building A", PNH_BRANCH, Gender.MALE, Set.of(neurology));

        upsertDoctor("Dr. Chanmony Neth", "chanmonyneth_mundulcare@mmprojectstar.com", "+855 12 222 333", "MD-KH-PNH-PED-01",
                "Senior Pediatric Consultant caring for newborns, infants, and adolescents. Expert in child developmental milestones, immunizations, and pediatric acute respiratory care.",
                "MD, Board Certified in Pediatrics — Royal University of Health Sciences",
                10, 30.00, "Room 202, Children's Health Pavilion, Building A", PNH_BRANCH, Gender.FEMALE, Set.of(pediatrics));

        upsertDoctor("Dr. Serey Vicheth", "sereyvicheth_mundulcare@mmprojectstar.com", "+855 12 444 555", "MD-KH-PNH-ORT-01",
                "Consultant Orthopedic Surgeon. Specializes in knee and hip joint replacements, complex fracture reduction, sports ligament reconstruction, and spinal ergonomics.",
                "MD, Orthopedic Surgery Fellowship — National University of Singapore",
                13, 40.00, "Room 204, Bone & Joint Institute, Building B", PNH_BRANCH, Gender.MALE, Set.of(orthopedics));

        upsertDoctor("Dr. Kanika Som", "kanikasom_mundulcare@mmprojectstar.com", "+855 12 666 888", "MD-KH-PNH-DEN-01",
                "Aesthetic & Reconstructive Dental Surgeon. Provides painless root canals, cosmetic veneers, restorative crowns, periodontic therapy, and wisdom tooth extractions.",
                "DDS, Master of Science in Endodontics — Chulalongkorn University",
                9, 32.00, "Room 112, Advanced Dental Care Suite, Building B", PNH_BRANCH, Gender.FEMALE, Set.of(dentistry));

        // =========================================================================
        // Branch 2: MundulCare Siem Reap Branch — All 7 Specialties
        // =========================================================================
        upsertDoctor("Dr. Dara Meas", "darameas_mundulcare@mmprojectstar.com", "+855 63 100 201", "MD-KH-SRP-GEN-01",
                "Senior Outpatient Physician. Specializes in tropical infectious illnesses, travel medicine, diabetes control, and annual executive health assessments.",
                "MD, Internal Medicine Specialist — RUHS & Calmette Hospital",
                11, 22.00, "Suite 101, Outpatient Clinic, Siem Reap Branch", SRP_BRANCH, Gender.MALE, Set.of(general));

        upsertDoctor("Dr. Chenda Prak", "chendaprak_mundulcare@mmprojectstar.com", "+855 63 200 302", "MD-KH-SRP-CARD-01",
                "Cardiovascular Health Specialist. Expert in 24-hour Holter monitoring, hypertension stabilization, ischemic heart evaluations, and cardiac rehabilitation.",
                "MD, Board Certified in Cardiovascular Medicine — RUHS",
                13, 35.00, "Suite 201, Heart & Vascular Unit, Siem Reap Branch", SRP_BRANCH, Gender.FEMALE, Set.of(cardiology));

        upsertDoctor("Dr. Sokha Hang", "sokhahang_mundulcare@mmprojectstar.com", "+855 63 300 403", "MD-KH-SRP-DERM-01",
                "Clinical Dermatologist & Laser Therapy Practitioner. Treats stubborn psoriasis, severe acne, fungal skin infections, and allergic dermatoses.",
                "MD, Clinical Dermatology & Cosmetology Diploma — Bangkok Hospital Academy",
                7, 26.00, "Suite 105, Skin Wellness Center, Siem Reap Branch", SRP_BRANCH, Gender.MALE, Set.of(dermatology));

        upsertDoctor("Dr. Kalyan Ly", "kalyanly_mundulcare@mmprojectstar.com", "+855 63 400 504", "MD-KH-SRP-NEUR-01",
                "Consultant Neurologist. Specializes in tension-type headaches, sleep disturbances, cervical radiculopathy, and neurovascular health.",
                "MD, Master of Neurology — Khon Kaen University",
                14, 42.00, "Suite 302, Neuroscience Unit, Siem Reap Branch", SRP_BRANCH, Gender.FEMALE, Set.of(neurology));

        upsertDoctor("Dr. Mary Johnson", "maryjohnson_mundulcare@mmprojectstar.com", "+855 12 777 888", "MD-KH-2024-205",
                "Dedicated Pediatrician caring for infant wellness, childhood seasonal illnesses, growth tracking, and pediatric checkups.",
                "MD, Board Certified Pediatrician — University of Melbourne",
                6, 20.00, "Room 201, Children's Health Center, Siem Reap Branch", SRP_BRANCH, Gender.FEMALE, Set.of(pediatrics));

        upsertDoctor("Dr. Visal Ouk", "visalouk_mundulcare@mmprojectstar.com", "+855 63 500 605", "MD-KH-SRP-ORT-01",
                "Orthopedic & Sports Medicine Specialist. Focused on rotator cuff repairs, ankle sprains, osteoarthritis viscosupplementation, and joint mobility rehabilitation.",
                "MD, Trauma & Orthopedics — Kantha Bopha & RUHS",
                12, 38.00, "Suite 208, Sports Injury & Joint Reconstruction, Siem Reap Branch", SRP_BRANCH, Gender.MALE, Set.of(orthopedics));

        upsertDoctor("Dr. Voleak Pich", "voleakpich_mundulcare@mmprojectstar.com", "+855 12 888 999", "MD-KH-2022-190",
                "Dental Surgeon & Oral Health Specialist. Providing expert care in gentle tooth extractions, cavity repairs, dental restorations, and gum treatments.",
                "DDS, Oral Surgery & Prosthodontics — University of Health Sciences",
                9, 30.00, "Room 110, Dental Care Center, Siem Reap Branch", SRP_BRANCH, Gender.FEMALE, Set.of(dentistry));

        // =========================================================================
        // Branch 3: MundulCare Battambang Medical Center — All 7 Specialties
        // =========================================================================
        upsertDoctor("Dr. Samnang Tep", "samnangtep_mundulcare@mmprojectstar.com", "+855 53 100 301", "MD-KH-BTB-GEN-01",
                "Internal Medicine Physician & Chronic Disease Coordinator. Expert in gastrointestinal pain, asthma management, metabolic health, and general physical exams.",
                "MD, General Internal Medicine — Battambang Provincial Hospital & RUHS",
                12, 20.00, "Clinic 101, Primary Care Wing, Battambang Medical Center", BTB_BRANCH, Gender.MALE, Set.of(general));

        upsertDoctor("Dr. Piseth Morn", "pisethmorn_mundulcare@mmprojectstar.com", "+855 53 200 402", "MD-KH-BTB-CARD-01",
                "Cardiologist & Preventative Heart Health Lead. Specializes in rhythm disorders, non-invasive stress testing, and hyperlipidemia therapy.",
                "MD, Clinical Cardiology Specialist — RUHS",
                10, 32.00, "Clinic 203, Cardio Diagnostics Clinic, Battambang Medical Center", BTB_BRANCH, Gender.MALE, Set.of(cardiology));

        upsertDoctor("Dr. Neary Rath", "nearyrath_mundulcare@mmprojectstar.com", "+855 53 300 503", "MD-KH-BTB-DERM-01",
                "Dermatologist & Skin Care Specialist. Treats chronic hives, severe pediatric eczema, contact allergies, and sun damage skin conditions.",
                "MD, Board Certified Dermatologist — Institute of Dermatology Bangkok",
                8, 25.00, "Clinic 104, Skin Health Unit, Battambang Medical Center", BTB_BRANCH, Gender.FEMALE, Set.of(dermatology));

        upsertDoctor("Dr. Sophal Roeun", "sophalroeun_mundulcare@mmprojectstar.com", "+855 53 400 604", "MD-KH-BTB-NEUR-01",
                "Consultant Neurologist & Spine Care Specialist. Expert in chronic tension headaches, sciatica, nerve impingement, and neuromuscular assessments.",
                "MD, Clinical Neurology Specialist — RUHS",
                13, 40.00, "Clinic 301, Comprehensive Neurology Clinic, Battambang Medical Center", BTB_BRANCH, Gender.MALE, Set.of(neurology));

        upsertDoctor("Dr. Bopha Sarin", "bophasarin_mundulcare@mmprojectstar.com", "+855 53 500 705", "MD-KH-BTB-PED-01",
                "Pediatrician & Child Nutrition Specialist. Providing gentle, friendly care for childhood fevers, digestive sensitivities, childhood wellness, and growth monitoring.",
                "MD, Pediatrics & Child Health — National Pediatric Hospital & RUHS",
                9, 24.00, "Clinic 108, Pediatric Care Unit, Battambang Medical Center", BTB_BRANCH, Gender.FEMALE, Set.of(pediatrics));

        upsertDoctor("Dr. Bunroeun Seng", "bunroeunseng_mundulcare@mmprojectstar.com", "+855 12 666 777", "MD-KH-2020-075",
                "Orthopedic Surgeon & Joint Care Specialist. Focused on chronic lower back pain, knee joint therapy, sports injuries, and posture alignment.",
                "MD, Orthopedic Surgery Specialist — RUHS & Calmette Hospital",
                11, 40.00, "Room 205, Orthopedics & Joint Clinic, Battambang Medical Center", BTB_BRANCH, Gender.MALE, Set.of(orthopedics));

        upsertDoctor("Dr. Chanthou Nuon", "chanthounuon_mundulcare@mmprojectstar.com", "+855 53 600 806", "MD-KH-BTB-DEN-01",
                "Dental Surgeon & General Dentist. Specializes in preventive cleanings, composite fillings, crowns, gum care, and painless emergency tooth extractions.",
                "DDS, Doctor of Dental Surgery — University of Health Sciences",
                8, 28.00, "Clinic 115, Family Dental Suite, Battambang Medical Center", BTB_BRANCH, Gender.FEMALE, Set.of(dentistry));

        log.info("Successfully seeded and synchronized all 21 doctors covering all 7 medical specialties across all 3 Hospital Branches.");
    }

    private Specialty getOrCreateSpecialty(String name, String description) {
        return specialtyRepo.findByName(name).orElseGet(() ->
                specialtyRepo.save(Specialty.builder()
                        .name(name)
                        .description(description)
                        .build())
        );
    }

    private void upsertDoctor(String name, String email, String phone, String license, String bio,
                              String qualifications, int exp, Double fee, String address, String branchName,
                              Gender gender, Set<Specialty> specialties) {
        Optional<Doctor> existingOpt = doctorRepo.findByLicenseNumber(license);
        Doctor doc;

        if (existingOpt.isPresent()) {
            doc = existingOpt.get();
            doc.setName(name);
            doc.setEmail(email);
            doc.setPhone(phone);
            doc.setBio(bio);
            doc.setQualifications(qualifications);
            doc.setExperienceYears(exp);
            doc.setConsultationFee(fee);
            doc.setAddress(address);
            doc.setBranchName(branchName);
            doc.setGender(gender);
            doc.setSpecialties(specialties);
            doctorRepo.save(doc);
        } else {
            doc = doctorRepo.save(Doctor.builder()
                    .name(name)
                    .email(email)
                    .phone(phone)
                    .licenseNumber(license)
                    .bio(bio)
                    .qualifications(qualifications)
                    .experienceYears(exp)
                    .consultationFee(fee)
                    .address(address)
                    .branchName(branchName)
                    .gender(gender)
                    .isActive(true)
                    .appointmentDurationMinutes(30)
                    .specialties(specialties)
                    .build());

            // Add standard weekly schedule
            doctorScheduleRepo.save(DoctorSchedule.builder()
                    .doctor(doc)
                    .dayOfWeek("MONDAY")
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(12, 0))
                    .isAvailable(true)
                    .build());

            doctorScheduleRepo.save(DoctorSchedule.builder()
                    .doctor(doc)
                    .dayOfWeek("WEDNESDAY")
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(17, 0))
                    .isAvailable(true)
                    .build());

            doctorScheduleRepo.save(DoctorSchedule.builder()
                    .doctor(doc)
                    .dayOfWeek("FRIDAY")
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(16, 0))
                    .isAvailable(true)
                    .build());
        }
    }
}
