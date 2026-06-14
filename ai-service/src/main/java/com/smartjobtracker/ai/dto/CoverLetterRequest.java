package com.smartjobtracker.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CoverLetterRequest {
    @NotBlank
    private String company;

    @NotBlank
    private String role;

    private String location;
    private String notes;
    private String resumeSummary;
}
