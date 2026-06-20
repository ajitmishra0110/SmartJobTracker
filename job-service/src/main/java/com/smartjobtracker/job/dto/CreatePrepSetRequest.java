package com.smartjobtracker.job.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreatePrepSetRequest {
    private String name;
    private String fileName;
    private List<String> questions = new ArrayList<>();
}
