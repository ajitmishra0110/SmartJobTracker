package com.smartjobtracker.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AiTextResponse {
    private String title;
    private String summary;
    private List<String> bullets;
    private String content;
}
