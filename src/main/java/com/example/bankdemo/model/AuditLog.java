package com.example.bankdemo.model;

import javax.persistence.*;
import java.time.LocalDateTime;

/** Append-only: the application exposes no update or delete for this entity. */
@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "transaction_id")
    public Long transactionId;
    @Column(name = "action", nullable = false, length = 50)
    public String action;
    @Column(name = "old_values", columnDefinition = "longtext")
    public String oldValues;
    @Column(name = "new_values", columnDefinition = "longtext")
    public String newValues;
    @Column(name = "performed_by", nullable = false)
    public Long performedBy;
    @Column(name = "performed_at")
    public LocalDateTime performedAt;
    @Column(name = "ip_address", length = 45)
    public String ipAddress;
}
