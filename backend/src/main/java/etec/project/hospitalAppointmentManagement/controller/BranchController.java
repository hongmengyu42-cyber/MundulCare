package etec.project.hospitalAppointmentManagement.controller;

import etec.project.hospitalAppointmentManagement.Repo.DoctorRepo;
import etec.project.hospitalAppointmentManagement.Repo.HospitalBranchRepo;
import etec.project.hospitalAppointmentManagement.dto.response.ApiResponse;
import etec.project.hospitalAppointmentManagement.dto.response.BranchRecommendationResponse;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.HospitalBranch;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Hospital Branches & Location Recommendations", description = "Public endpoints for hospital branches and province-based nearest branch recommendations")
public class BranchController {

    private final HospitalBranchRepo branchRepo;
    private final DoctorRepo doctorRepo;

    // Hospital branch coordinates (Latitude, Longitude)
    private static final double PNH_LAT = 11.5564;
    private static final double PNH_LNG = 104.9282;

    private static final double SRP_LAT = 13.3633;
    private static final double SRP_LNG = 103.8564;

    private static final double BTB_LAT = 13.0957;
    private static final double BTB_LNG = 103.2022;

    public static String resolveRecommendedBranchName(String province) {
        if (province == null || province.isBlank()) {
            return "MundulCare Main Campus (Phnom Penh)";
        }
        String p = province.toLowerCase();
        if (p.contains("battambang") || p.contains("pailin") || p.contains("pursat")) {
            return "MundulCare Battambang Medical Center";
        }
        if (p.contains("siem reap") || p.contains("banteay meanchey") || p.contains("poipet") ||
            p.contains("sisophon") || p.contains("oddar") || p.contains("preah vihear") || p.contains("kampong thom")) {
            return "MundulCare Siem Reap Branch";
        }
        return "MundulCare Main Campus (Phnom Penh)";
    }

    @GetMapping
    @Operation(summary = "Get all active hospital branches for patients and visitors")
    public ResponseEntity<ApiResponse<List<HospitalBranch>>> getAllActiveBranches() {
        List<HospitalBranch> list = branchRepo.findAll().stream()
                .filter(HospitalBranch::isActive)
                .sorted(Comparator.comparing(HospitalBranch::isMainCampus).reversed()
                        .thenComparing(HospitalBranch::getId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Hospital branches retrieved successfully", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get branch details by ID")
    public ResponseEntity<ApiResponse<HospitalBranch>> getBranchById(@PathVariable Long id) {
        return branchRepo.findById(id)
                .map(b -> ResponseEntity.ok(ApiResponse.success("Branch found", b)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/recommend")
    @Operation(summary = "Recommend nearest hospital branch based on user province or GPS coordinates")
    public ResponseEntity<ApiResponse<BranchRecommendationResponse>> recommendBranch(
            @RequestParam(required = false) String province,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        List<HospitalBranch> branches = branchRepo.findAll().stream()
                .filter(HospitalBranch::isActive)
                .collect(Collectors.toList());

        if (branches.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("No active branches configured"));
        }

        HospitalBranch mainPnh = branches.stream()
                .filter(b -> b.getCity() != null && b.getCity().toLowerCase().contains("phnom penh"))
                .findFirst().orElse(branches.get(0));

        HospitalBranch siemReap = branches.stream()
                .filter(b -> b.getCity() != null && b.getCity().toLowerCase().contains("siem reap"))
                .findFirst().orElse(mainPnh);

        HospitalBranch battambang = branches.stream()
                .filter(b -> b.getCity() != null && b.getCity().toLowerCase().contains("battambang"))
                .findFirst().orElse(mainPnh);

        HospitalBranch chosenBranch = mainPnh;
        double distanceKm = 0.0;
        String travelTime = "Immediate · 5-15 mins drive";
        String note = "Located in central Phnom Penh with 24/7 emergency & trauma response.";
        String cleanProvince = province != null ? province.trim() : "Phnom Penh";

        if (lat != null && lng != null) {
            double dPnh = haversine(lat, lng, PNH_LAT, PNH_LNG);
            double dSrp = haversine(lat, lng, SRP_LAT, SRP_LNG);
            double dBtb = haversine(lat, lng, BTB_LAT, BTB_LNG);

            if (dSrp < dPnh && dSrp < dBtb) {
                chosenBranch = siemReap;
                distanceKm = Math.round(dSrp * 10.0) / 10.0;
                travelTime = estimateTravelTime(distanceKm);
                cleanProvince = "GPS Location (Near Siem Reap)";
                note = "Siem Reap branch is closest to your detected GPS location.";
            } else if (dBtb < dPnh && dBtb < dSrp) {
                chosenBranch = battambang;
                distanceKm = Math.round(dBtb * 10.0) / 10.0;
                travelTime = estimateTravelTime(distanceKm);
                cleanProvince = "GPS Location (Near Battambang)";
                note = "Battambang Medical Center is closest to your detected GPS location.";
            } else {
                chosenBranch = mainPnh;
                distanceKm = Math.round(dPnh * 10.0) / 10.0;
                travelTime = estimateTravelTime(distanceKm);
                cleanProvince = "GPS Location (Near Phnom Penh)";
                note = "MundulCare Main Campus is closest to your detected GPS location.";
            }
        } else if (province != null && !province.isBlank()) {
            String pLower = province.toLowerCase();

            // Battambang Region
            if (pLower.contains("battambang")) {
                chosenBranch = battambang;
                distanceKm = 4.0;
                travelTime = "~10-20 mins drive";
                note = "Serving Battambang city and surrounding western districts.";
            } else if (pLower.contains("pailin")) {
                chosenBranch = battambang;
                distanceKm = 82.0;
                travelTime = "~1 hr 20 mins drive via NR 57";
                note = "Direct highway connection via National Road 57.";
            } else if (pLower.contains("pursat")) {
                chosenBranch = battambang;
                distanceKm = 105.0;
                travelTime = "~1 hr 30 mins drive via NR 5";
                note = "Connected via National Road 5 northwest corridor.";
            }
            // Siem Reap Region
            else if (pLower.contains("siem reap")) {
                chosenBranch = siemReap;
                distanceKm = 3.5;
                travelTime = "~10-15 mins drive";
                note = "Located on Charles de Gaulle Blvd, minutes from central Siem Reap.";
            } else if (pLower.contains("banteay meanchey") || pLower.contains("poipet") || pLower.contains("sisophon")) {
                chosenBranch = siemReap;
                distanceKm = 104.0;
                travelTime = "~1 hr 45 mins drive via NR 6";
                note = "Fast travel via National Road 6.";
            } else if (pLower.contains("oddar meanchey") || pLower.contains("samraong")) {
                chosenBranch = siemReap;
                distanceKm = 132.0;
                travelTime = "~2 hours drive via NR 68";
                note = "Primary regional tertiary hospital for northern provinces.";
            } else if (pLower.contains("preah vihear")) {
                chosenBranch = siemReap;
                distanceKm = 138.0;
                travelTime = "~2 hours 15 mins drive via NR 62";
                note = "Accessible via Route 62 and National Road 6.";
            } else if (pLower.contains("kampong thom")) {
                chosenBranch = siemReap;
                distanceKm = 145.0;
                travelTime = "~2 hours drive via NR 6";
                note = "Equal distance to Siem Reap and Phnom Penh; Siem Reap offers direct highway access.";
            }
            // Phnom Penh & Southern/Eastern Region
            else if (pLower.contains("phnom penh")) {
                chosenBranch = mainPnh;
                distanceKm = 2.0;
                travelTime = "Immediate · 5-15 mins drive";
                note = "Central tertiary hospital with complete multi-specialty trauma unit.";
            } else if (pLower.contains("kandal")) {
                chosenBranch = mainPnh;
                distanceKm = 18.0;
                travelTime = "~25-35 mins drive";
                note = "Direct suburban access across Monivong and Chroy Changvar bridges.";
            } else if (pLower.contains("kampong speu")) {
                chosenBranch = mainPnh;
                distanceKm = 48.0;
                travelTime = "~50 mins drive via NR 4";
                note = "Quick connection via National Road 4 and Expressway.";
            } else if (pLower.contains("takeo")) {
                chosenBranch = mainPnh;
                distanceKm = 78.0;
                travelTime = "~1 hr 20 mins drive via NR 2 / NR 3";
                note = "Connected via National Road 2 and 3.";
            } else if (pLower.contains("kampong chhnang")) {
                chosenBranch = mainPnh;
                distanceKm = 91.0;
                travelTime = "~1 hr 30 mins drive via NR 5";
                note = "Direct access via National Road 5 southern link.";
            } else if (pLower.contains("prey veng")) {
                chosenBranch = mainPnh;
                distanceKm = 94.0;
                travelTime = "~1 hr 45 mins via Neak Loeung Bridge";
                note = "Direct access via National Road 1.";
            } else if (pLower.contains("kampong cham")) {
                chosenBranch = mainPnh;
                distanceKm = 124.0;
                travelTime = "~2 hours drive via NR 6 / NR 7";
                note = "Direct highway route via Kizuna Bridge and National Road 7.";
            } else if (pLower.contains("svay rieng") || pLower.contains("bavet")) {
                chosenBranch = mainPnh;
                distanceKm = 125.0;
                travelTime = "~2 hours drive via NR 1";
                note = "Connected via Asian Highway 1 (National Road 1).";
            } else if (pLower.contains("kampot")) {
                chosenBranch = mainPnh;
                distanceKm = 148.0;
                travelTime = "~2.5 hours drive via NR 3";
                note = "Fast transit via newly renovated National Road 3.";
            } else if (pLower.contains("kep")) {
                chosenBranch = mainPnh;
                distanceKm = 162.0;
                travelTime = "~2.5 hours drive via NR 33 & NR 3";
                note = "Direct coastal connection to Phnom Penh headquarters.";
            } else if (pLower.contains("sihanouk") || pLower.contains("preah sihanouk") || pLower.contains("kompong som")) {
                chosenBranch = mainPnh;
                distanceKm = 210.0;
                travelTime = "~2 hours drive via Phnom Penh-Sihanoukville Expressway";
                note = "Direct express travel via the E4 Expressway (2 hours).";
            } else if (pLower.contains("tboung khmum") || pLower.contains("suong")) {
                chosenBranch = mainPnh;
                distanceKm = 152.0;
                travelTime = "~2.5 hours drive via NR 7";
                note = "Accessible via National Road 7.";
            } else if (pLower.contains("kratie")) {
                chosenBranch = mainPnh;
                distanceKm = 245.0;
                travelTime = "~4 hours drive via NR 7";
                note = "Eastern regional transfer corridor to Phnom Penh Main Campus.";
            } else if (pLower.contains("koh kong")) {
                chosenBranch = mainPnh;
                distanceKm = 285.0;
                travelTime = "~4.5 hours drive via NR 48";
                note = "Connected via National Road 48.";
            } else {
                // Default fallback to Phnom Penh Main HQ
                chosenBranch = mainPnh;
                distanceKm = 15.0;
                travelTime = "Standard travel time";
                note = "MundulCare Main Campus provides full tertiary and emergency medical services.";
            }
        }

        // Count available doctors at the recommended branch
        final String targetBranchName = chosenBranch.getName();
        List<Doctor> allDocs = doctorRepo.findByIsActiveTrue();
        int docCount = (int) allDocs.stream()
                .filter(d -> d.getBranchName() != null && d.getBranchName().equalsIgnoreCase(targetBranchName))
                .count();

        // Fallback count if branch name not explicit
        if (docCount == 0) {
            docCount = allDocs.size();
        }

        BranchRecommendationResponse resp = BranchRecommendationResponse.builder()
                .userProvince(cleanProvince)
                .recommendedBranch(chosenBranch)
                .estimatedDistanceKm(distanceKm)
                .estimatedTravelTime(travelTime)
                .note(note)
                .availableDoctorsCount(docCount)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Nearest hospital branch recommended successfully", resp));
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private String estimateTravelTime(double km) {
        if (km <= 5) return "Immediate · 5-15 mins drive";
        if (km <= 25) return "~20-35 mins drive";
        if (km <= 60) return "~50 mins drive";
        if (km <= 120) return "~1.5 - 2 hrs drive";
        int hours = (int) (km / 65);
        return "~" + hours + " hrs drive";
    }
}
