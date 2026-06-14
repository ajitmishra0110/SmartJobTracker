package com.smartjobtracker.job.controller;

import com.smartjobtracker.job.entity.Job;
import com.smartjobtracker.job.repository.JobRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private final JobRepository jobRepository;

    public JobController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @PostMapping
    public Job createJob(@RequestBody Job job, Authentication authentication) {
        job.setId(null);
        job.setOwnerEmail(currentEmail(authentication));
        normalize(job);
        return jobRepository.save(job);
    }

    @GetMapping
    public List<Job> getJobs(Authentication authentication) {
        return jobRepository.findByOwnerEmailOrderByIdDesc(currentEmail(authentication));
    }

    @PutMapping("/{id}")
    public Job updateJob(@PathVariable Long id, @RequestBody Job updatedJob, Authentication authentication) {
        String ownerEmail = currentEmail(authentication);
        Job job = jobRepository.findByIdAndOwnerEmail(id, ownerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        job.setCompany(updatedJob.getCompany());
        job.setRole(updatedJob.getRole());
        job.setStatus(updatedJob.getStatus());
        job.setLocation(updatedJob.getLocation());
        job.setSalaryRange(updatedJob.getSalaryRange());
        job.setJobUrl(updatedJob.getJobUrl());
        job.setSource(updatedJob.getSource());
        job.setAppliedDate(updatedJob.getAppliedDate());
        job.setNextActionDate(updatedJob.getNextActionDate());
        job.setContactName(updatedJob.getContactName());
        job.setContactEmail(updatedJob.getContactEmail());
        job.setNotes(updatedJob.getNotes());

        normalize(job);
        return jobRepository.save(job);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteJob(@PathVariable Long id, Authentication authentication) {
        String ownerEmail = currentEmail(authentication);
        Job job = jobRepository.findByIdAndOwnerEmail(id, ownerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        jobRepository.delete(job);
    }

    private String currentEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authentication.getName();
    }

    private void normalize(Job job) {
        job.setCompany(clean(job.getCompany()));
        job.setRole(clean(job.getRole()));
        job.setStatus(validStatus(job.getStatus()));
        job.setLocation(clean(job.getLocation()));
        job.setSalaryRange(clean(job.getSalaryRange()));
        job.setJobUrl(clean(job.getJobUrl()));
        job.setSource(clean(job.getSource()));
        job.setAppliedDate(clean(job.getAppliedDate()));
        job.setNextActionDate(clean(job.getNextActionDate()));
        job.setContactName(clean(job.getContactName()));
        job.setContactEmail(clean(job.getContactEmail()));
        job.setNotes(clean(job.getNotes()));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String validStatus(String status) {
        String cleanStatus = clean(status);
        return switch (cleanStatus) {
            case "Saved", "Applied", "Interview", "Offer", "Rejected" -> cleanStatus;
            default -> "Saved";
        };
    }
}
