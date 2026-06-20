package com.smartjobtracker.job.controller;

import com.smartjobtracker.job.dto.CreatePrepSetRequest;
import com.smartjobtracker.job.dto.UpdatePrepQuestionRequest;
import com.smartjobtracker.job.entity.PrepQuestion;
import com.smartjobtracker.job.entity.PrepSet;
import com.smartjobtracker.job.repository.PrepSetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/jobs/prep-sets")
public class PrepSetController {

    private final PrepSetRepository prepSetRepository;

    public PrepSetController(PrepSetRepository prepSetRepository) {
        this.prepSetRepository = prepSetRepository;
    }

    @GetMapping
    public List<PrepSet> listPrepSets(Authentication authentication) {
        return prepSetRepository.findByOwnerEmailWithQuestions(currentEmail(authentication));
    }

    @PostMapping
    public PrepSet createPrepSet(@RequestBody CreatePrepSetRequest request, Authentication authentication) {
        String name = cleanRequired(request.getName(), "Prep name is required");
        List<String> questionTexts = normalizeQuestions(request.getQuestions());
        if (questionTexts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one question is required");
        }

        PrepSet prepSet = PrepSet.builder()
                .ownerEmail(currentEmail(authentication))
                .name(name)
                .fileName(clean(request.getFileName()))
                .createdAt(LocalDate.now().toString())
                .questions(new ArrayList<>())
                .build();

        for (String text : questionTexts) {
            PrepQuestion question = PrepQuestion.builder()
                    .prepSet(prepSet)
                    .text(text)
                    .solved(false)
                    .solvedDate(null)
                    .build();
            prepSet.getQuestions().add(question);
        }

        return prepSetRepository.save(prepSet);
    }

    @PatchMapping("/{prepId}/questions/{questionId}")
    public PrepQuestion updateQuestion(
            @PathVariable Long prepId,
            @PathVariable Long questionId,
            @RequestBody UpdatePrepQuestionRequest request,
            Authentication authentication
    ) {
        PrepSet prepSet = prepSetRepository.findByIdAndOwnerEmailWithQuestions(prepId, currentEmail(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prep set not found"));

        PrepQuestion question = prepSet.getQuestions().stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        if (request.getSolved() != null) {
            question.setSolved(request.getSolved());
            if (request.getSolved()) {
                String date = clean(request.getSolvedDate());
                question.setSolvedDate(date.isBlank() ? LocalDate.now().toString() : date);
            } else {
                question.setSolvedDate(null);
            }
        } else if (request.getSolvedDate() != null && question.isSolved()) {
            question.setSolvedDate(clean(request.getSolvedDate()));
        }

        prepSetRepository.save(prepSet);
        return question;
    }

    @DeleteMapping("/{prepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePrepSet(@PathVariable Long prepId, Authentication authentication) {
        PrepSet prepSet = prepSetRepository.findByIdAndOwnerEmailWithQuestions(prepId, currentEmail(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prep set not found"));
        prepSetRepository.delete(prepSet);
    }

    private String currentEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authentication.getName();
    }

    private List<String> normalizeQuestions(List<String> questions) {
        if (questions == null) {
            return List.of();
        }
        Set<String> seen = new LinkedHashSet<>();
        for (String question : questions) {
            String cleaned = clean(question);
            if (cleaned.length() >= 8) {
                seen.add(cleaned);
            }
        }
        return new ArrayList<>(seen);
    }

    private String cleanRequired(String value, String message) {
        String cleaned = clean(value);
        if (cleaned.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
