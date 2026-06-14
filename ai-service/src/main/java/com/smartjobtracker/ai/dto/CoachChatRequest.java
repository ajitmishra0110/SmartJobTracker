package com.smartjobtracker.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CoachChatRequest {
    @NotBlank
    private String message;

    @Valid
    private List<JobContextRequest> jobs = new ArrayList<>();
}
