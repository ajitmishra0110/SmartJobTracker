package com.smartjobtracker.job.repository;

import com.smartjobtracker.job.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByOwnerEmailOrderByIdDesc(String ownerEmail);

    Optional<Job> findByIdAndOwnerEmail(Long id, String ownerEmail);
}
