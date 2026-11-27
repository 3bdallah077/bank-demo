package com.example.bankdemo.service;

import com.example.bankdemo.model.*;
import com.example.bankdemo.repo.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

/** FR-11 daily report, FR-12 fraud review, audit log reads. */
@Service
public class ReportService {
    private final TransactionRepository txs;
    private final DailyReportRepository reports;
    private final FraudFlagRepository flags;
    private final AuditLogRepository audit;
    private final AccountRepository accounts;

    public ReportService(TransactionRepository t, DailyReportRepository r, FraudFlagRepository f, AuditLogRepository a, AccountRepository acc) {
        this.txs = t; this.reports = r; this.flags = f; this.audit = a; this.accounts = acc;
    }

    private Map<String, Object> compute(LocalDate d) {
        LocalDateTime from = d.atStartOfDay(), to = d.plusDays(1).atStartOfDay();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reportDate", d.toString());
        m.put("totalDeposits", txs.sumByType(TxType.DEPOSIT, from, to));
        m.put("totalWithdrawals", txs.sumByType(TxType.WITHDRAW, from, to));
        m.put("totalTransfers", txs.sumByType(TxType.TRANSFER_OUT, from, to));
        m.put("transactionCount", txs.countCompletedBetween(from, to));
        return m;
    }

    /** Live computation from the ledger (does not write). */
    @Transactional(readOnly = true)
    public Map<String, Object> preview(LocalDate d) {
        if (d == null) d = LocalDate.now(ZoneOffset.UTC);
        Map<String, Object> m = compute(d);
        reports.findByReportDate(d).ifPresent(r -> {
            m.put("savedReport", view(r));
        });
        return m;
    }

    /** Saves (or refreshes) the row in daily_reports. */
    @Transactional
    public Map<String, Object> generate(LocalDate d, User by) {
        if (d == null) d = LocalDate.now(ZoneOffset.UTC);
        if (d.isAfter(LocalDate.now(ZoneOffset.UTC))) throw ApiException.bad("Cannot generate a report for a future date");
        Map<String, Object> c = compute(d);
        DailyReport r = reports.findByReportDate(d).orElseGet(DailyReport::new);
        r.reportDate = d;
        r.totalDeposits = (BigDecimal) c.get("totalDeposits");
        r.totalWithdrawals = (BigDecimal) c.get("totalWithdrawals");
        r.totalTransfers = (BigDecimal) c.get("totalTransfers");
        r.transactionCount = ((Long) c.get("transactionCount")).intValue();
        r.generatedBy = by.id;
        r.generatedAt = LocalDateTime.now(ZoneOffset.UTC).withNano(0);
        return view(reports.save(r));
    }

    private Map<String, Object> view(DailyReport r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reportDate", r.reportDate.toString());
        m.put("totalDeposits", r.totalDeposits); m.put("totalWithdrawals", r.totalWithdrawals);
        m.put("totalTransfers", r.totalTransfers); m.put("transactionCount", r.transactionCount);
        m.put("generatedBy", r.generatedBy);
        m.put("generatedAt", r.generatedAt == null ? null : r.generatedAt.toString() + "Z");
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> fraudFlags() {
        List<Map<String, Object>> out = new ArrayList<>();
        Map<Long, String> numbers = new HashMap<>();
        for (Account a : accounts.findAll()) numbers.put(a.id, a.accountNumber);
        for (FraudFlag f : flags.findAllByOrderByIdDesc()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.id); m.put("transactionId", f.transactionId); m.put("thresholdAmount", f.thresholdAmount);
            m.put("reviewed", f.reviewed); m.put("reviewedBy", f.reviewedBy);
            m.put("reviewedAt", f.reviewedAt == null ? null : f.reviewedAt.toString() + "Z"); m.put("notes", f.notes);
            m.put("createdAt", f.createdAt == null ? null : f.createdAt.toString() + "Z");
            txs.findById(f.transactionId).ifPresent(t -> {
                m.put("amount", t.amount); m.put("type", t.type); m.put("accountNumber", numbers.get(t.accountId));
            });
            out.add(m);
        }
        return out;
    }

    @Transactional
    public Map<String, Object> review(Long id, String notes, User by) {
        FraudFlag f = flags.findById(id).orElseThrow(() -> ApiException.notFound("Flag not found"));
        if (notes != null && notes.length() > 1000) throw ApiException.bad("Notes too long (max 1000 characters)");
        f.reviewed = true; f.reviewedBy = by.id; f.reviewedAt = LocalDateTime.now(ZoneOffset.UTC).withNano(0);
        f.notes = notes == null || notes.trim().isEmpty() ? null : notes.trim();
        flags.save(f);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.id); m.put("reviewed", true);
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> auditLog() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AuditLog l : audit.findAllByOrderByIdDesc(PageRequest.of(0, 500))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.id); m.put("transactionId", l.transactionId); m.put("action", l.action);
            m.put("oldValues", l.oldValues); m.put("newValues", l.newValues); m.put("performedBy", l.performedBy);
            m.put("performedAt", l.performedAt == null ? null : l.performedAt.toString() + "Z"); m.put("ipAddress", l.ipAddress);
            out.add(m);
        }
        return out;
    }
}
