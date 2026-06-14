package com.smartjobtracker.ai.controller;

import com.smartjobtracker.ai.dto.AiTextResponse;
import com.smartjobtracker.ai.dto.CoachChatRequest;
import com.smartjobtracker.ai.dto.CoverLetterRequest;
import com.smartjobtracker.ai.dto.JobContextRequest;
import com.smartjobtracker.ai.dto.ParseJobRequest;
import com.smartjobtracker.ai.dto.ParsedJobResponse;
import com.smartjobtracker.ai.dto.PipelineInsightsRequest;
import com.smartjobtracker.ai.service.AiAssistantService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/parse-job")
    public ParsedJobResponse parseJob(@Valid @RequestBody ParseJobRequest request) {
        return aiAssistantService.parseJobPosting(request.getText());
    }

    @PostMapping("/interview-prep")
    public AiTextResponse interviewPrep(@Valid @RequestBody JobContextRequest request) {
        return aiAssistantService.interviewPrep(request);
    }

    @PostMapping("/next-action")
    public AiTextResponse nextAction(@Valid @RequestBody JobContextRequest request) {
        return aiAssistantService.nextAction(request);
    }

    @PostMapping("/cover-letter")
    public AiTextResponse coverLetter(@Valid @RequestBody CoverLetterRequest request) {
        return aiAssistantService.coverLetter(request);
    }

    @PostMapping("/fit-plan")
    public AiTextResponse fitPlan(@Valid @RequestBody JobContextRequest request) {
        return aiAssistantService.fitPlan(request);
    }

    @PostMapping("/outreach-draft")
    public AiTextResponse outreachDraft(@Valid @RequestBody JobContextRequest request) {
        return aiAssistantService.outreachDraft(request);
    }

    @PostMapping("/pipeline-insights")
    public AiTextResponse pipelineInsights(@Valid @RequestBody PipelineInsightsRequest request) {
        return aiAssistantService.pipelineInsights(request.getJobs());
    }

    @PostMapping("/coach")
    public AiTextResponse coach(@Valid @RequestBody CoachChatRequest request) {
        return aiAssistantService.coachChat(request.getMessage(), request.getJobs());
    }
}
