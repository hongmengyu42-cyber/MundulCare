package etec.project.hospitalAppointmentManagement.entity;

import etec.project.hospitalAppointmentManagement.enums.Gender;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "doctors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(nullable = false, length = 100)
    private String name; // e.g. "Dr. Sarah Jenkins"

    @Column(nullable = false, length = 150)
    private String email; // Doctor's email where booking emails will be sent!

    @Column(length = 20)
    private String phone; // e.g. "+855 12 345 678"

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Column(name = "profile_image")
    private String profileImage; // Image URL

    @Column(name = "license_number", nullable = false, unique = true, length = 50)
    private String licenseNumber; // e.g. "MD-2026-001"

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String qualifications;

    @Column(name = "experience_years", nullable = false)
    @Builder.Default
    private int experienceYears = 0;

    @Column(name = "consultation_fee", nullable = false)
    @Builder.Default
    private Double consultationFee = 0.0; // in USD

    @Column(length = 255)
    private String address; // e.g. "Room 304, Building A"

    @Column(name = "branch_name", length = 150)
    @Builder.Default
    private String branchName = "MundulCare Main Campus (Phnom Penh)";

    @Column(name = "appointment_duration_minutes")
    @Builder.Default
    private Integer appointmentDurationMinutes = 30;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // Doctor specialties
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "doctor_specialties",
            joinColumns = @JoinColumn(name = "doctor_id"),
            inverseJoinColumns = @JoinColumn(name = "specialty_id")
    )
    @Builder.Default
    private Set<Specialty> specialties = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
