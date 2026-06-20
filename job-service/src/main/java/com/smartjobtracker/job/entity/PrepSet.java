package com.smartjobtracker.job.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "prep_sets", indexes = {
        @Index(name = "idx_prep_sets_owner", columnList = "owner_email")
})
public class PrepSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_email")
    @JsonIgnore
    private String ownerEmail;

    private String name;

    private String fileName;

    private String createdAt;

    @OneToMany(mappedBy = "prepSet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<PrepQuestion> questions = new ArrayList<>();
}
