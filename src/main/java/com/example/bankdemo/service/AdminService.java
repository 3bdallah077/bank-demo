package com.example.bankdemo.service;

import com.example.bankdemo.model.*;
import com.example.bankdemo.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;
import java.util.regex.Pattern;

/** US-10: create / disable / assign roles. */
@Service
public class AdminService {
    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_.-]{3,50}$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s<>\"]+@[^@\\s<>\"]+\\.[^@\\s<>\"]+$");
    private final UserRepository users;
    private final AccountRepository accounts;
    private final AuthService auth;
    private final SecureRandom rnd = new SecureRandom();

    public AdminService(UserRepository u, AccountRepository a, AuthService auth) { this.users = u; this.accounts = a; this.auth = auth; }

    public static Map<String, Object> view(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id); m.put("username", u.username); m.put("fullName", u.fullName); m.put("email", u.email);
        m.put("role", u.role); m.put("active", u.active); m.put("locked", u.locked);
        m.put("failedLoginAttempts", u.failedLoginAttempts);
        return m; // never includes password_hash
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : users.findAll()) out.add(view(u));
        out.sort(Comparator.comparing(m -> (Long) m.get("id")));
        return out;
    }

    @Transactional
    public Map<String, Object> create(String username, String password, String fullName, String email, Role role) {
        if (username == null || !USERNAME.matcher(username).matches()) throw ApiException.bad("Username must be 3-50 characters: letters, digits, _ . -");
        if (password == null || password.length() < 8 || password.length() > 72) throw ApiException.bad("Password must be 8-72 characters");
        if (fullName == null || fullName.trim().isEmpty() || fullName.length() > 200) throw ApiException.bad("Full name is required (max 200 characters)");
        if (email != null && !email.isEmpty() && (email.length() > 255 || !EMAIL.matcher(email).matches())) throw ApiException.bad("Invalid email");
        if (role == null) throw ApiException.bad("Role is required");
        if (users.existsByUsername(username)) throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, "Username already exists");
        User u = new User();
        u.username = username; u.passwordHash = auth.encoder().encode(password); u.fullName = fullName.trim();
        u.email = (email == null || email.isEmpty()) ? null : email; u.role = role;
        return view(users.save(u));
    }

    /** Self sign-up creates the customer and their empty account in one transaction. */
    @Transactional
    public void registerCustomer(String username, String password, String fullName, String email) {
        Long userId = (Long) create(username, password, fullName, email, Role.CUSTOMER).get("id");
        openFor(userId);
    }

    @Transactional
    public Map<String, Object> update(Long id, User admin, Role role, Boolean active, Boolean unlock) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
        if (u.id.equals(admin.id) && ((active != null && !active) || (role != null && role != admin.role)))
            throw ApiException.bad("You cannot disable or change the role of your own account");
        if (role != null) u.role = role;
        if (active != null) u.active = active;
        if (Boolean.TRUE.equals(unlock)) { u.locked = false; u.failedLoginAttempts = 0; u.lockUntil = null; }
        return view(users.save(u));
    }

    @Transactional
    public Map<String, Object> openAccount(Long userId) {
        return openFor(userId);
    }

    /** Creates the account row. Shared by the admin screen and by public self sign-up. */
    @Transactional
    public Map<String, Object> openFor(Long userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (u.role != Role.CUSTOMER) throw ApiException.bad("Accounts can only be opened for CUSTOMER users");
        String number;
        do {
            number = String.format("EGP-%03d-%010d", rnd.nextInt(1000), (long) (rnd.nextDouble() * 1e10));
        } while (accounts.findByAccountNumber(number).isPresent());
        Account a = new Account();
        a.accountNumber = number; a.userId = u.id;
        return LedgerService.view(accounts.save(a));
    }
}
