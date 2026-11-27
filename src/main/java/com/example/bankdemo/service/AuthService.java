package com.example.bankdemo.service;

import com.example.bankdemo.model.User;
import com.example.bankdemo.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class AuthService {
    private final UserRepository users;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    @Value("${bank.login.max-failed-attempts:3}") private int maxAttempts;
    @Value("${bank.login.lock-minutes:15}") private int lockMinutes;

    public AuthService(UserRepository users) { this.users = users; }

    public BCryptPasswordEncoder encoder() { return encoder; }

    /** FR-01 / FR-02. noRollbackFor: the failed-attempt counter must be saved even though we throw. */
    @Transactional(noRollbackFor = ApiException.class)
    public User login(String username, String password) {
        User u = users.findByUsername(username).orElse(null);
        if (u == null) {
            encoder.matches(password, "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"); // even out timing
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (Boolean.TRUE.equals(u.locked)) {
            if (u.lockUntil != null && !u.lockUntil.isAfter(now)) { // lock expired
                u.locked = false; u.failedLoginAttempts = 0; u.lockUntil = null;
            } else {
                throw new ApiException(HttpStatus.LOCKED, "Account is locked after too many failed attempts. Contact an administrator.");
            }
        }
        if (!Boolean.TRUE.equals(u.active)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        if (!encoder.matches(password, u.passwordHash)) {
            int n = (u.failedLoginAttempts == null ? 0 : u.failedLoginAttempts) + 1;
            u.failedLoginAttempts = n;
            if (n >= maxAttempts) {
                u.locked = true;
                u.lockUntil = now.plusMinutes(lockMinutes);
                users.save(u);
                throw new ApiException(HttpStatus.LOCKED, "Account is locked after " + maxAttempts + " failed attempts.");
            }
            users.save(u);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        u.failedLoginAttempts = 0;
        u.locked = false;
        u.lockUntil = null;
        return users.save(u);
    }
}
