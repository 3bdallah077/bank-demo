package com.example.bankdemo.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "account_number", nullable = false, length = 30)
    public String accountNumber;
    @Column(name = "user_id", nullable = false)
    public Long userId;
    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    public BigDecimal balance = BigDecimal.ZERO;
    @Column(name = "currency", length = 3)
    public String currency = "EGP";
    @Column(name = "is_active")
    public Boolean active = true;
    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}
