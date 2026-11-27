package com.example.bankdemo.web;

import com.example.bankdemo.model.*;
import com.example.bankdemo.service.LedgerService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final LedgerService ledger;
    public TransactionController(LedgerService l) { this.ledger = l; }

    public static class MoneyRequest {
        @NotBlank @Size(max = 30) public String accountNumber;
        @NotNull public BigDecimal amount;
        @Size(max = 200) public String description;
    }

    public static class TransferRequest {
        @NotBlank @Size(max = 30) public String fromAccountNumber;
        @NotBlank @Size(max = 30) public String toAccountNumber;
        @NotNull public BigDecimal amount;
        @Size(max = 200) public String description;
    }

    @PostMapping("/deposit")
    @Roles({Role.CUSTOMER, Role.TELLER})
    public Map<String, Object> deposit(@RequestAttribute("user") User u, @Valid @RequestBody MoneyRequest r, HttpServletRequest req) {
        Transaction t = ledger.deposit(u, r.accountNumber, r.amount, r.description, req.getRemoteAddr());
        return result(t, r.accountNumber.trim());
    }

    @PostMapping("/withdraw")
    @Roles({Role.CUSTOMER, Role.TELLER})
    public Map<String, Object> withdraw(@RequestAttribute("user") User u, @Valid @RequestBody MoneyRequest r, HttpServletRequest req) {
        Transaction t = ledger.withdraw(u, r.accountNumber, r.amount, r.description, req.getRemoteAddr());
        return result(t, r.accountNumber.trim());
    }

    @PostMapping("/transfer")
    @Roles({Role.CUSTOMER, Role.TELLER})
    public Map<String, Object> transfer(@RequestAttribute("user") User u, @Valid @RequestBody TransferRequest r, HttpServletRequest req) {
        return ledger.transfer(u, r.fromAccountNumber, r.toAccountNumber, r.amount, r.description, req.getRemoteAddr());
    }

    /** Auditor / manager read-only view of every transaction (US-11). */
    @GetMapping
    @Roles({Role.AUDITOR, Role.MANAGER, Role.ADMIN})
    public List<Map<String, Object>> all(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ledger.allTransactions(from, to);
    }

    private Map<String, Object> result(Transaction t, String number) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("transaction", LedgerService.view(t, number));
        return m;
    }
}
