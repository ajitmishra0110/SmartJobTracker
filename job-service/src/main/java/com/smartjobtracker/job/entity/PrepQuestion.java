package com.smartjobtracker.job.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "prep_questions", indexes = {
        @Index(name = "idx_prep_questions_set", columnList = "prep_set_id")
})
public class PrepQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prep_set_id")
    @JsonIgnore
    private PrepSet prepSet;

    @Column(length = 4000)
    private String text;

    private boolean solved;

    private String solvedDate;
}
