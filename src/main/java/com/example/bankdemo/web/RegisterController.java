package com.example.bankdemo.web;

import com.example.bankdemo.model.*;
import com.example.bankdemo.service.*;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.Map;

/**
 * Public self-service sign-up (customer opens their own account).
 *
 * Flow: POST /api/auth/register  ->  user row (role CUSTOMER) + one account row (balance 0.00),
 * both written inside one database transaction and stored with a BCrypt hash.
 * After a successful sign-up the caller is logged in immediately.
 *
 * Rules that still apply after self sign-up:
 *  - the role is always CUSTOMER; a caller cannot ask for TELLER / MANAGER / ADMIN / AUDITOR
 *  - usernames are unique, case-sensitive as stored
 *  - the password is validated with the same rules as the admin's "create user" form
 */
@RestController
@RequestMapping("/api/auth")
public class RegisterController {
    private final AdminService admin;
    private final AuthService auth;

    public RegisterController(AdminService admin, AuthService auth) {
        this.admin = admin;
        this.auth = auth;
    }

    public static class RegisterRequest {
        @NotBlank @Size(max = 100) public String username;
        @NotBlank @Size(max = 200) public String password;
        @Size(max = 200) public String fullName;
        @Size(max = 255) public String email;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest r, HttpServletRequest req) {
        // Reuse admin validation and commit both rows together before opening a session.
        String username = r.username.trim();
        admin.registerCustomer(username, r.password, r.fullName, r.email);

        User u = auth.login(username, r.password); // also validates the hash round-trip
        javax.servlet.http.HttpSession old = req.getSession(false);
        if (old != null) old.invalidate();
        req.getSession(true).setAttribute(AuthInterceptor.SESSION_UID, u.id);
        return AdminService.view(u);
    }
}
