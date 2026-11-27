package com.example.bankdemo.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_reports")
public class DailyReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "report_date", nullable = false)
    public LocalDate reportDate;
    @Column(name = "total_deposits", precision = 15, scale = 2)
    public BigDecimal totalDeposits = BigDecimal.ZERO;
    @Column(name = "total_withdrawals", precision = 15, scale = 2)
    public BigDecimal totalWithdrawals = BigDecimal.ZERO;
    @Column(name = "total_transfers", precision = 15, scale = 2)
    public BigDecimal totalTransfers = BigDecimal.ZERO;
    @Column(name = "transaction_count")
    public Integer transactionCount = 0;
    @Column(name = "generated_by")
    public Long generatedBy;
    @Column(name = "generated_at")
    public LocalDateTime generatedAt;
    @Column(name = "report_data", columnDefinition = "longtext")
    public String reportData;
}
