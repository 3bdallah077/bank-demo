package com.example.bankdemo.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fraud_flags")
public class FraudFlag {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "transaction_id", nullable = false)
    public Long transactionId;
    @Column(name = "threshold_amount", nullable = false, precision = 15, scale = 2)
    public BigDecimal thresholdAmount;
    @Column(name = "is_reviewed")
    public Boolean reviewed = false;
    @Column(name = "reviewed_by")
    public Long reviewedBy;
    @Column(name = "reviewed_at")
    public LocalDateTime reviewedAt;
    @Column(name = "notes", columnDefinition = "text")
    public String notes;
    @Column(name = "created_at")
    public LocalDateTime createdAt;
}
