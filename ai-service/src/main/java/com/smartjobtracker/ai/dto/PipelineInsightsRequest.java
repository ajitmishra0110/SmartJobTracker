package com.smartjobtracker.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class PipelineInsightsRequest {
    @NotEmpty
    @Valid
    private List<JobContextRequest> jobs;
}
