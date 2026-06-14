package com.smartjobtracker.ai.dto;

import lombok.Data;

@Data
public class JobContextRequest {
    private String company;
    private String role;
    private String status;
    private String location;
    private String salaryRange;
    private String jobUrl;
    private String source;
    private String appliedDate;
    private String nextActionDate;
    private String contactName;
    private String contactEmail;
    private String notes;
}
