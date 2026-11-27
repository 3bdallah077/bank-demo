package com.example.bankdemo.web;

import com.example.bankdemo.model.*;
import com.example.bankdemo.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.*;

/** Manager, admin and auditor endpoints. There is intentionally no PUT/DELETE for transactions or audit_log (NFR-10). */
@RestController
@RequestMapping("/api")
public class StaffController {
    private final ReportService reports;
    private final AdminService admin;
    public StaffController(ReportService r, AdminService a) { this.reports = r; this.admin = a; }

    // ---- reports (FR-11)
    @GetMapping("/reports/daily")
    @Roles({Role.MANAGER, Role.ADMIN})
    public Map<String, Object> daily(@RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return reports.preview(date);
    }

    @PostMapping("/reports/daily")
    @Roles(Role.MANAGER)
    public Map<String, Object> generate(@RequestAttribute("user") User u,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return reports.generate(date, u);
    }

    // ---- fraud flags (FR-12)
    @GetMapping("/fraud-flags")
    @Roles({Role.MANAGER, Role.AUDITOR})
    public List<Map<String, Object>> flags() { return reports.fraudFlags(); }

    public static class ReviewRequest { public String notes; }

    @PostMapping("/fraud-flags/{id}/review")
    @Roles(Role.MANAGER)
    public Map<String, Object> review(@RequestAttribute("user") User u, @PathVariable Long id, @RequestBody(required = false) ReviewRequest r) {
        return reports.review(id, r == null ? null : r.notes, u);
    }

    // ---- audit log (US-11)
    @GetMapping("/audit-log")
    @Roles({Role.AUDITOR, Role.MANAGER})
    public List<Map<String, Object>> audit() { return reports.auditLog(); }

    // ---- user administration (US-10)
    @GetMapping("/admin/users")
    @Roles(Role.ADMIN)
    public List<Map<String, Object>> users() { return admin.list(); }

    public static class CreateUser {
        public String username, password, fullName, email;
        public Role role;
    }

    @PostMapping("/admin/users")
    @Roles(Role.ADMIN)
    public Map<String, Object> create(@RequestBody CreateUser r) {
        return admin.create(r.username, r.password, r.fullName, r.email, r.role);
    }

    public static class UpdateUser { public Role role; public Boolean active; public Boolean unlock; }

    @PatchMapping("/admin/users/{id}")
    @Roles(Role.ADMIN)
    public Map<String, Object> update(@RequestAttribute("user") User me, @PathVariable Long id, @RequestBody UpdateUser r) {
        return admin.update(id, me, r.role, r.active, r.unlock);
    }

    public static class OpenAccount { @NotNull public Long userId; }

    @PostMapping("/admin/accounts")
    @Roles(Role.ADMIN)
    public Map<String, Object> open(@Valid @RequestBody OpenAccount r) { return admin.openAccount(r.userId); }
}
