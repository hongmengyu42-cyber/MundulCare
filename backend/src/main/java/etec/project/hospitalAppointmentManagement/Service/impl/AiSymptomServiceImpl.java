package etec.project.hospitalAppointmentManagement.Service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import etec.project.hospitalAppointmentManagement.Repo.DoctorRepo;
import etec.project.hospitalAppointmentManagement.Repo.SpecialtyRepo;
import etec.project.hospitalAppointmentManagement.Service.AiSymptomService;
import etec.project.hospitalAppointmentManagement.Service.DoctorService;
import etec.project.hospitalAppointmentManagement.dto.request.SymptomMatchRequest;
import etec.project.hospitalAppointmentManagement.dto.response.DoctorResponse;
import etec.project.hospitalAppointmentManagement.dto.response.SymptomMatchResponse;
import etec.project.hospitalAppointmentManagement.entity.Doctor;
import etec.project.hospitalAppointmentManagement.entity.Specialty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSymptomServiceImpl implements AiSymptomService {

    private final DoctorRepo doctorRepo;
    private final SpecialtyRepo specialtyRepo;
    private final DoctorService doctorService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=";

    private static final Set<String> NON_MEDICAL_GREETINGS = Set.of(
            "hi", "hello", "hey", "hola", "bonjour", "greetings", "good morning", "good afternoon",
            "good evening", "how are you", "who are you", "what are you", "what can you do",
            "tell me a joke", "what is your name", "bye", "goodbye", "ok", "okay", "test", "testing",
            "thanks", "thank you", "cool", "nice", "yes", "no", "sup", "yo", "help"
    );

    private static final List<String> MEDICAL_KEYWORDS = List.of(
            "pain", "ache", "fever", "cough", "headache", "chest", "dizzy", "stomach", "rash",
            "skin", "blood", "bleed", "vomit", "nausea", "swollen", "hurt", "sore", "throat",
            "injury", "broken", "fracture", "doctor", "specialist", "hospital", "clinic", "breath",
            "cold", "flu", "teeth", "tooth", "ear", "eye", "vision", "joint", "bone", "muscle",
            "burn", "infection", "allergy", "allergic", "cramp", "pressure", "heart", "lung",
            "liver", "kidney", "stiff", "itch", "diarrhea", "constipation", "migraine", "sick",
            "ill", "sprain", "wound", "cut", "symptom", "disease", "treatment", "medicine", "pill",
            "cardio", "dental", "pediatric", "neuro", "ortho", "surgery", "pregnant", "pregnancy"
    );

    private boolean isObviousNonMedical(String input) {
        if (input == null || input.trim().isEmpty()) {
            return true;
        }
        String cleaned = input.toLowerCase().trim().replaceAll("[^a-zA-Z0-9\\s]", "").replaceAll("\\s+", " ");
        if (cleaned.length() <= 2) {
            return true;
        }
        if (NON_MEDICAL_GREETINGS.contains(cleaned)) {
            return true;
        }
        if (cleaned.startsWith("how are you") || cleaned.startsWith("who are you") || cleaned.startsWith("what are you")
                || cleaned.startsWith("what can you do") || cleaned.startsWith("what is your name") || cleaned.startsWith("tell me a joke")) {
            return true;
        }
        return false;
    }

    private boolean isLikelyMedical(String input) {
        if (input == null || input.trim().isEmpty()) {
            return false;
        }
        String lower = input.toLowerCase();
        for (String keyword : MEDICAL_KEYWORDS) {
            if (lower.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public SymptomMatchResponse matchSymptoms(SymptomMatchRequest request) {
        String inputSymptoms = request.getSymptoms() != null ? request.getSymptoms().trim() : "";

        // Resolve recommended hospital branch from request branchName or province
        String targetBranch = null;
        if (request.getBranchName() != null && !request.getBranchName().isBlank()) {
            targetBranch = request.getBranchName().trim();
        } else if (request.getProvince() != null && !request.getProvince().isBlank()) {
            targetBranch = etec.project.hospitalAppointmentManagement.controller.BranchController.resolveRecommendedBranchName(request.getProvince());
        }

        // Fast-path guard: Obvious non-medical input (greetings, empty text, chit-chat)
        if (isObviousNonMedical(inputSymptoms)) {
            return SymptomMatchResponse.builder()
                    .medicalRelated(false)
                    .detectedSpecialty(null)
                    .clinicalExplanation("I am MundulCare's Clinical Triaging Assistant, specifically designed to help match patient medical symptoms with hospital specialists. Please describe your symptoms or physical discomfort (e.g., chest pain, persistent cough, migraine, rash), and I will recommend the right doctor for you.")
                    .recommendedBranch(targetBranch)
                    .userProvince(request.getProvince())
                    .matchingDoctors(Collections.emptyList()) // Strict rule: Do NOT recommend doctors for non-medical inquiries!
                    .build();
        }

        // 1. Dynamically retrieve all active hospital specialties from PostgreSQL
        List<String> availableSpecialties = Collections.emptyList();
        if (specialtyRepo != null) {
            availableSpecialties = specialtyRepo.findAll().stream()
                    .map(Specialty::getName)
                    .collect(Collectors.toList());
        }

        if (availableSpecialties.isEmpty()) {
            availableSpecialties = List.of("General Medicine");
        }

        boolean isMedicalRelated = true;
        String detectedSpecialty = null;
        String explanation = "";

        // 2. Use Gemini Flash AI if an API key is configured
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equals("YOUR_GEMINI_API_KEY_HERE")) {
            try {
                Map<String, Object> aiResult = callGeminiFlash(inputSymptoms, availableSpecialties);
                isMedicalRelated = Boolean.TRUE.equals(aiResult.get("isMedicalRelated"));
                detectedSpecialty = (String) aiResult.get("specialty");
                explanation = (String) aiResult.getOrDefault("explanation", "");
            } catch (Exception e) {
                log.warn("Gemini API call failed: {}", e.getMessage());
                // Fallback heuristic: only classify as medical if keywords match
                if (isLikelyMedical(inputSymptoms)) {
                    isMedicalRelated = true;
                    detectedSpecialty = "General Medicine";
                    explanation = "Our AI assistant is temporarily running in offline mode. Based on your symptoms, we've connected you with our General Medicine team, who can evaluate your condition and provide care or referrals.";
                } else {
                    isMedicalRelated = false;
                    detectedSpecialty = null;
                    explanation = "I am MundulCare's Clinical Triaging Assistant, specifically designed to help match patient medical symptoms with hospital specialists. Please describe what symptoms or physical discomfort you are experiencing, and I will connect you with the appropriate doctor.";
                }
            }
        } else {
            log.warn("Gemini API key is not configured - applying rule-based heuristic.");
            if (isLikelyMedical(inputSymptoms)) {
                isMedicalRelated = true;
                detectedSpecialty = "General Medicine";
                explanation = "Our AI assistant is not currently configured. Based on your symptoms, we've connected you with our General Medicine team, who can evaluate your condition and provide care or referrals.";
            } else {
                isMedicalRelated = false;
                detectedSpecialty = null;
                explanation = "I am MundulCare's Clinical Triaging Assistant, specifically designed to help match patient medical symptoms with hospital specialists. Please describe what symptoms or physical discomfort you are experiencing, and I will connect you with the appropriate doctor.";
            }
        }

        // Strict Requirement: If user asks about something else, DO NOT recommend doctors!
        if (!isMedicalRelated || detectedSpecialty == null || detectedSpecialty.trim().isEmpty() || "null".equalsIgnoreCase(detectedSpecialty)) {
            return SymptomMatchResponse.builder()
                    .medicalRelated(false)
                    .detectedSpecialty(null)
                    .clinicalExplanation(explanation)
                    .recommendedBranch(targetBranch)
                    .userProvince(request.getProvince())
                    .matchingDoctors(Collections.emptyList()) // ZERO DOCTORS RECOMMENDED!
                    .build();
        }

        // 3. Fetch active doctors matching the detected specialty from database
        List<Doctor> doctors;
        if (targetBranch != null && !targetBranch.isBlank() && !"ALL".equalsIgnoreCase(targetBranch)) {
            doctors = doctorRepo.findBySpecialtyNamesAndBranchIgnoreCase(
                    List.of(detectedSpecialty.toLowerCase()),
                    targetBranch
            );

            // Fallback to General Medicine doctors at THAT specific branch if no specific specialist on site
            if (doctors.isEmpty()) {
                doctors = doctorRepo.findBySpecialtyNamesAndBranchIgnoreCase(
                        List.of("general medicine"),
                        targetBranch
                );
                if (!detectedSpecialty.equalsIgnoreCase("General Medicine") && !doctors.isEmpty()) {
                    explanation += " (Note: Showing General Medicine physicians on duty at " + targetBranch + " for your initial checkup.)";
                }
            }

            // Secondary fallback: Any doctor at that branch
            if (doctors.isEmpty()) {
                doctors = doctorRepo.findByBranchNameIgnoreCase(targetBranch);
            }
        } else {
            doctors = doctorRepo.findBySpecialtyNamesIgnoreCase(List.of(detectedSpecialty.toLowerCase()));
            if (doctors.isEmpty()) {
                doctors = doctorRepo.findBySpecialtyNamesIgnoreCase(List.of("general medicine"));
                if (!detectedSpecialty.equalsIgnoreCase("General Medicine")) {
                    explanation += " (Note: Our General Medicine practitioners are available to assist with your initial checkup.)";
                }
            }
        }

        List<DoctorResponse> matchingDoctorResponses = doctors.stream()
                .map(d -> doctorService.getDoctorById(d.getId()))
                .collect(Collectors.toList());

        return SymptomMatchResponse.builder()
                .medicalRelated(true)
                .detectedSpecialty(detectedSpecialty)
                .clinicalExplanation(explanation)
                .recommendedBranch(targetBranch)
                .userProvince(request.getProvince())
                .matchingDoctors(matchingDoctorResponses)
                .build();
    }

    private Map<String, Object> callGeminiFlash(String symptoms, List<String> availableSpecialties) throws Exception {
        String specialtyListString = String.join(", ", availableSpecialties);

        String prompt = "You are an empathetic medical triaging AI assistant for MundulCare hospital appointment platform.\n" +
                "Your SOLE purpose is to analyze patient medical symptoms or health inquiries and recommend the appropriate hospital medical specialist.\n\n" +
                "The hospital currently has the following departments/specialties:\n" +
                "[" + specialtyListString + "]\n\n" +
                "User input: \"" + symptoms + "\"\n\n" +
                "Evaluation Guidelines:\n" +
                "1. FIRST, determine if the user input is a genuine health complaint, medical symptom, physical/mental discomfort, illness, injury, or inquiry about seeing a medical doctor/specialist.\n" +
                "2. If the user input is NOT medical (for example: casual chit-chat, greetings like 'hi' or 'hello', jokes, questions about weather, food recipes, sports, politics, math, programming, general knowledge, asking who you are, or anything unrelated to health and medical care):\n" +
                "   - Set \"isMedicalRelated\": false\n" +
                "   - Set \"specialty\": null\n" +
                "   - Set \"explanation\": \"I am MundulCare's Clinical Triaging Assistant, dedicated solely to matching medical symptoms with hospital specialists. Please describe your symptoms or health concern (e.g., chest pain, persistent cough, skin rash), and I will be happy to connect you with the right specialist.\"\n" +
                "3. If the user input IS a health concern or medical symptom:\n" +
                "   - Set \"isMedicalRelated\": true\n" +
                "   - If the symptoms clearly match one of our available hospital departments listed above, choose that exact specialty name from the list.\n" +
                "   - If the symptoms are common or mild primary care complaints (e.g. cold, flu, fever, cough, stomach ache, fatigue), choose \"General Medicine\".\n" +
                "   - If the symptoms relate to a specialty not listed in the available departments, choose \"General Medicine\" and explain that our General Medicine doctors can conduct the initial assessment and issue an external specialist referral.\n" +
                "   - Set \"explanation\": 2-3 sentences patient-friendly clinical explanation of why this specialist is recommended.\n\n" +
                "Respond ONLY with a valid JSON object matching this structure with NO backticks or markdown:\n" +
                "{\"isMedicalRelated\": true, \"specialty\": \"Exact Specialty Name or null\", \"explanation\": \"...\"}";

        Map<String, Object> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> requestBody = Map.of("contents", List.of(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        String response = restTemplate.postForObject(GEMINI_API_URL + geminiApiKey, entity, String.class);

        JsonNode root = objectMapper.readTree(response);
        String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText().trim();

        if (text.startsWith("```json")) {
            text = text.substring(7);
        }
        if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }

        JsonNode jsonResult = objectMapper.readTree(text.trim());
        Map<String, Object> result = new HashMap<>();
        boolean isMedical = jsonResult.path("isMedicalRelated").asBoolean(true);
        result.put("isMedicalRelated", isMedical);

        String specialty = jsonResult.hasNonNull("specialty") ? jsonResult.path("specialty").asText() : null;
        if (specialty != null && ("null".equalsIgnoreCase(specialty.trim()) || specialty.trim().isEmpty())) {
            specialty = null;
        }
        result.put("specialty", specialty);
        result.put("explanation", jsonResult.path("explanation").asText(""));
        return result;
    }

}
