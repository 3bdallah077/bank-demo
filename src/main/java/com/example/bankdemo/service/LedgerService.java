package com.example.bankdemo.service;

import com.example.bankdemo.model.*;
import com.example.bankdemo.repo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class LedgerService {
    private static final Pattern ACC = Pattern.compile("^[A-Za-z0-9-]{5,30}$");
    private static final BigDecimal MAX = new BigDecimal("9999999999999.99");
    private final AccountRepository accounts;
    private final TransactionRepository txs;
    private final AuditLogRepository audit;
    private final FraudFlagRepository flags;
    @Value("${bank.fraud.threshold:1000.00}") private BigDecimal fraudThreshold;
    @Value("${bank.testing.fail-transfer-after-debit:false}") private boolean failAfterDebit;

    public LedgerService(AccountRepository a, TransactionRepository t, AuditLogRepository l, FraudFlagRepository f) {
        this.accounts = a; this.txs = t; this.audit = l; this.flags = f;
    }

    static LocalDateTime now() { return LocalDateTime.now(ZoneOffset.UTC).withNano(0); }

    static String cleanNumber(String n) {
        if (n == null || !ACC.matcher(n.trim()).matches()) throw ApiException.bad("Invalid account number format");
        return n.trim();
    }

    static BigDecimal cleanAmount(BigDecimal a) {
        if (a == null) throw ApiException.bad("Amount is required");
        if (a.signum() <= 0) throw ApiException.bad("Amount must be greater than 0");
        if (a.scale() > 2 && a.stripTrailingZeros().scale() > 2) throw ApiException.bad("Amount can have at most 2 decimal places");
        if (a.compareTo(MAX) > 0) throw ApiException.bad("Amount is too large");
        return a.setScale(2);
    }

    static String cleanDesc(String d, String dflt) {
        if (d == null || d.trim().isEmpty()) return dflt;
        d = d.trim();
        if (d.length() > 200) throw ApiException.bad("Description is too long (max 200 characters)");
        return d;
    }

    /** Customers may only touch their own accounts; tellers may act on any account. */
    private void checkAccess(User actor, Account a, boolean forMoneyMovement) {
        if (actor.role == Role.CUSTOMER) {
            if (!a.userId.equals(actor.id)) throw ApiException.forbidden("You can only use your own accounts");
        } else if (actor.role != Role.TELLER && (forMoneyMovement || actor.role == null)) {
            throw ApiException.forbidden("Your role cannot do this");
        }
    }

    public Account accountForRead(User actor, String number) {
        Account a = accounts.findByAccountNumber(cleanNumber(number)).orElseThrow(() -> ApiException.notFound("Account not found"));
        if (actor.role == Role.CUSTOMER && !a.userId.equals(actor.id)) throw ApiException.forbidden("You can only view your own accounts");
        return a;
    }

    @Transactional
    public Transaction deposit(User actor, String number, BigDecimal amount, String desc, String ip) {
        BigDecimal amt = cleanAmount(amount);
        Account a = accounts.lockByAccountNumber(cleanNumber(number)).orElseThrow(() -> ApiException.notFound("Account not found"));
        checkAccess(actor, a, true);
        if (!Boolean.TRUE.equals(a.active)) throw ApiException.bad("Account is not active");
        a.balance = a.balance.add(amt);
        accounts.save(a);
        Transaction t = record(a, amt, TxType.DEPOSIT, cleanDesc(desc, "Deposit"), actor, ip, null);
        return t;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Transaction withdraw(User actor, String number, BigDecimal amount, String desc, String ip) {
        BigDecimal amt = cleanAmount(amount);
        Account a = accounts.lockByAccountNumber(cleanNumber(number)).orElseThrow(() -> ApiException.notFound("Account not found"));
        checkAccess(actor, a, true);
        if (!Boolean.TRUE.equals(a.active)) throw ApiException.bad("Account is not active");
        if (a.balance.compareTo(amt) < 0) {
            // Keep a FAILED ledger row (the sample data has one too). Balance is untouched.
            Transaction f = new Transaction();
            f.accountId = a.id; f.amount = amt; f.type = TxType.WITHDRAW; f.status = TxStatus.FAILED;
            f.description = cleanDesc(desc, "Withdrawal"); f.failureReason = "Insufficient funds";
            f.createdAt = now(); f.createdBy = actor.id; f.ipAddress = ip;
            txs.save(f);
            throw ApiException.bad("Insufficient funds");
        }
        a.balance = a.balance.subtract(amt);
        accounts.save(a);
        return record(a, amt, TxType.WITHDRAW, cleanDesc(desc, "Withdrawal"), actor, ip, null);
    }

    /** FR-06 / NFR-05: one DB transaction. Any exception rolls back both balances and both ledger rows. */
    @Transactional
    public Map<String, Object> transfer(User actor, String from, String to, BigDecimal amount, String desc, String ip) {
        BigDecimal amt = cleanAmount(amount);
        String f = cleanNumber(from), t = cleanNumber(to);
        if (f.equalsIgnoreCase(t)) throw ApiException.bad("Cannot transfer to the same account");
        // Lock in a fixed order (by account number) to avoid deadlocks between opposite transfers.
        Account first, second;
        if (f.compareTo(t) < 0) {
            first = accounts.lockByAccountNumber(f).orElseThrow(() -> ApiException.notFound("Source account not found"));
            second = accounts.lockByAccountNumber(t).orElse(null);
        } else {
            second = accounts.lockByAccountNumber(t).orElse(null);
            first = accounts.lockByAccountNumber(f).orElseThrow(() -> ApiException.notFound("Source account not found"));
        }
        Account src = first.accountNumber.equals(f) ? first : second;
        Account dst = first.accountNumber.equals(f) ? second : first;
        if (src == null) throw ApiException.notFound("Source account not found");
        checkAccess(actor, src, true);
        if (dst == null) throw ApiException.bad("Invalid recipient account");
        if (!Boolean.TRUE.equals(src.active) || !Boolean.TRUE.equals(dst.active)) throw ApiException.bad("Account is not active");
        if (!src.currency.equals(dst.currency)) throw ApiException.bad("Currency mismatch");
        if (src.balance.compareTo(amt) < 0) throw ApiException.bad("Insufficient funds");

        src.balance = src.balance.subtract(amt);
        accounts.save(src);
        accounts.flush();
        if (failAfterDebit) throw new IllegalStateException("Injected failure after debit (bank.testing.fail-transfer-after-debit=true)");
        dst.balance = dst.balance.add(amt);
        accounts.save(dst);

        String note = cleanDesc(desc, null);
        Transaction out = record(src, amt, TxType.TRANSFER_OUT, "Transfer to " + dst.accountNumber + (note == null ? "" : ": " + note), actor, ip, null);
        Transaction in = record(dst, amt, TxType.TRANSFER_IN, "Transfer from " + src.accountNumber + (note == null ? "" : ": " + note), actor, ip, out.id);
        // FR-07 / US-11: record() already writes one audit row per ledger entry, so both legs are covered.
        out.referenceId = in.id;
        txs.save(out);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("debit", view(out, src.accountNumber));
        r.put("credit", view(in, dst.accountNumber));
        r.put("sourceBalance", src.balance);
        return r;
    }

    private Transaction record(Account a, BigDecimal amt, TxType type, String desc, User actor, String ip, Long ref) {
        Transaction t = new Transaction();
        t.accountId = a.id; t.amount = amt; t.type = type; t.status = TxStatus.COMPLETED;
        t.description = desc; t.referenceId = ref; t.createdAt = now(); t.createdBy = actor.id; t.ipAddress = ip;
        t = txs.save(t);
        writeAudit(t, actor, ip);
        // FR-12: flag transactions at or above the configurable limit (the seed flag is for exactly 1000.00).
        if (type != TxType.TRANSFER_IN && amt.compareTo(fraudThreshold) >= 0) {
            FraudFlag ff = new FraudFlag();
            ff.transactionId = t.id; ff.thresholdAmount = fraudThreshold; ff.createdAt = now();
            flags.save(ff);
        }
        return t;
    }

    /** One audit_log row per ledger entry (FR-07, US-11, NFR-10: append only). */
    private void writeAudit(Transaction t, User actor, String ip) {
        AuditLog l = new AuditLog();
        l.transactionId = t.id;
        l.action = "INSERT";
        l.performedBy = actor.id;
        l.performedAt = now();
        l.ipAddress = ip;
        l.newValues = "{\"type\": \"" + t.type + "\", \"amount\": " + t.amount.toPlainString()
                + ", \"account_id\": " + t.accountId + ", \"status\": \"" + t.status + "\"}";
        audit.save(l);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(User actor, String number, LocalDate from, LocalDate to) {
        Account a = accountForRead(actor, number);
        if (from != null && to != null && to.isBefore(from)) throw ApiException.bad("'to' date is before 'from' date");
        List<Map<String, Object>> out = new ArrayList<>();
        for (Transaction t : txs.history(a.id, start(from), to == null ? null : to.plusDays(1).atStartOfDay(), PageRequest.of(0, 500))) {
            out.add(view(t, a.accountNumber));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> allTransactions(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) throw ApiException.bad("'to' date is before 'from' date");
        Map<Long, String> numbers = new HashMap<>();
        for (Account a : accounts.findAll()) numbers.put(a.id, a.accountNumber);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Transaction t : txs.all(start(from), to == null ? null : to.plusDays(1).atStartOfDay(), PageRequest.of(0, 500))) {
            out.add(view(t, numbers.get(t.accountId)));
        }
        return out;
    }

    private static LocalDateTime start(LocalDate d) { return d == null ? null : d.atStartOfDay(); }

    public static Map<String, Object> view(Transaction t, String accountNumber) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.id);
        m.put("type", t.type);
        m.put("status", t.status);
        m.put("amount", t.amount);
        m.put("accountNumber", accountNumber);
        m.put("description", t.description);
        m.put("referenceId", t.referenceId);
        m.put("createdAt", t.createdAt == null ? null : t.createdAt.toString() + "Z");
        m.put("createdBy", t.createdBy);
        return m;
    }

    public static Map<String, Object> view(Account a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.id);
        m.put("accountNumber", a.accountNumber);
        m.put("balance", a.balance);
        m.put("currency", a.currency);
        m.put("active", a.active);
        m.put("userId", a.userId);
        return m;
    }
}
