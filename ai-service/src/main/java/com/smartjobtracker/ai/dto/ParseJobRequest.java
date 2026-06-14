package com.smartjobtracker.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ParseJobRequest {
    @NotBlank
    private String text;
}
