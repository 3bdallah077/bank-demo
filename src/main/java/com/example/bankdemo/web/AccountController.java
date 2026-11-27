package com.example.bankdemo.web;

import com.example.bankdemo.model.*;
import com.example.bankdemo.repo.AccountRepository;
import com.example.bankdemo.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final AccountRepository accounts;
    private final LedgerService ledger;
    public AccountController(AccountRepository a, LedgerService l) { this.accounts = a; this.ledger = l; }

    /** US-02 / FR-03: the logged-in customer's accounts with current balances (read from the DB on every call). */
    @GetMapping("/mine")
    @Roles(Role.CUSTOMER)
    public List<Map<String, Object>> mine(@RequestAttribute("user") User u) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Account a : accounts.findByUserIdOrderById(u.id)) out.add(LedgerService.view(a));
        return out;
    }

    /** US-02: balance of one account (customers: own accounts only). */
    @GetMapping("/{number}")
    public Map<String, Object> one(@RequestAttribute("user") User u, @PathVariable String number) {
        return LedgerService.view(ledger.accountForRead(u, number));
    }

    /** US-07 / FR-10: staff search by account number. */
    @GetMapping("/search")
    @Roles({Role.TELLER, Role.MANAGER, Role.ADMIN})
    public Map<String, Object> search(@RequestAttribute("user") User u, @RequestParam("number") String number) {
        return LedgerService.view(ledger.accountForRead(u, number));
    }

    /** US-06 / FR-08: history, newest first, optional inclusive date filter (yyyy-MM-dd, UTC days). */
    @GetMapping("/{number}/transactions")
    public List<Map<String, Object>> history(@RequestAttribute("user") User u, @PathVariable String number,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ledger.history(u, number, from, to);
    }
}
