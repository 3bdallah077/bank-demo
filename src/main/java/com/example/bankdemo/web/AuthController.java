package com.example.bankdemo.web;

import com.example.bankdemo.model.User;
import com.example.bankdemo.service.AdminService;
import com.example.bankdemo.service.AuthService;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    public static class LoginRequest {
        @NotBlank @Size(max = 100) public String username;
        @NotBlank @Size(max = 200) public String password;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest r, HttpServletRequest req) {
        User u = auth.login(r.username.trim(), r.password);
        HttpSession old = req.getSession(false);
        if (old != null) old.invalidate(); // prevent session fixation
        req.getSession(true).setAttribute(AuthInterceptor.SESSION_UID, u.id);
        return AdminService.view(u);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest req) {
        HttpSession s = req.getSession(false);
        if (s != null) s.invalidate();
        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestAttribute("user") User u) { return AdminService.view(u); }
}
