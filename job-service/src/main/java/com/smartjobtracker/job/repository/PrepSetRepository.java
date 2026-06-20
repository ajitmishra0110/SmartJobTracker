package com.smartjobtracker.job.repository;

import com.smartjobtracker.job.entity.PrepSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrepSetRepository extends JpaRepository<PrepSet, Long> {

    @Query("SELECT DISTINCT p FROM PrepSet p LEFT JOIN FETCH p.questions WHERE p.ownerEmail = :ownerEmail ORDER BY p.id DESC")
    List<PrepSet> findByOwnerEmailWithQuestions(@Param("ownerEmail") String ownerEmail);

    @Query("SELECT p FROM PrepSet p LEFT JOIN FETCH p.questions WHERE p.id = :id AND p.ownerEmail = :ownerEmail")
    Optional<PrepSet> findByIdAndOwnerEmailWithQuestions(@Param("id") Long id, @Param("ownerEmail") String ownerEmail);
}
