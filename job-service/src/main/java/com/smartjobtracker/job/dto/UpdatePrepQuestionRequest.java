package com.smartjobtracker.job.dto;

import lombok.Data;

@Data
public class UpdatePrepQuestionRequest {
    private Boolean solved;
    private String solvedDate;
}
