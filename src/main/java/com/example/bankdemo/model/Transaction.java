package com.example.bankdemo.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "account_id", nullable = false)
    public Long accountId;
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    public BigDecimal amount;
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, columnDefinition = "enum('DEPOSIT','WITHDRAW','TRANSFER_IN','TRANSFER_OUT')")
    public TxType type;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "enum('PENDING','COMPLETED','FAILED','REVERSED')")
    public TxStatus status = TxStatus.PENDING;
    @Column(name = "description", length = 500)
    public String description;
    @Column(name = "reference_id")
    public Long referenceId;
    @Column(name = "failure_reason", length = 500)
    public String failureReason;
    // Set explicitly by the application (UTC) so the value is available right after insert.
    @Column(name = "created_at")
    public LocalDateTime createdAt;
    @Column(name = "created_by", nullable = false)
    public Long createdBy;
    @Column(name = "ip_address", length = 45)
    public String ipAddress;
}
