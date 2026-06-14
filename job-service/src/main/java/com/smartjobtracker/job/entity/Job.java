package com.smartjobtracker.job.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        name = "jobs",
        indexes = {
                @Index(name = "idx_jobs_owner_status", columnList = "owner_email,status"),
                @Index(name = "idx_jobs_owner_next_action", columnList = "owner_email,next_action_date")
        }
)
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_email")
    @JsonIgnore
    private String ownerEmail;

    private String company;
    private String role;
    private String status;
    private String location;
    private String salaryRange;
    private String jobUrl;
    private String source;
    private String appliedDate;
    @Column(name = "next_action_date")
    private String nextActionDate;
    private String contactName;
    private String contactEmail;

    @Column(length = 2000)
    private String notes;
}
