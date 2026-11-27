package com.example.bankdemo.web;

import com.example.bankdemo.model.User;
import com.example.bankdemo.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.Arrays;

/** Session check + role check for every /api/** call except login. The user is reloaded each time, so disabling a user takes effect immediately. */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String SESSION_UID = "uid";
    private final UserRepository users;

    public AuthInterceptor(UserRepository users) { this.users = users; }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) return true;
        if (req.getRequestURI().equals("/api/auth/login")) return true;
        HttpSession s = req.getSession(false);
        Long uid = s == null ? null : (Long) s.getAttribute(SESSION_UID);
        User u = uid == null ? null : users.findById(uid).orElse(null);
        if (u == null || !Boolean.TRUE.equals(u.active)) {
            if (s != null) s.invalidate();
            deny(res, HttpStatus.UNAUTHORIZED, "Not logged in or session expired");
            return false;
        }
        Roles r = ((HandlerMethod) handler).getMethodAnnotation(Roles.class);
        if (r != null && !Arrays.asList(r.value()).contains(u.role)) {
            deny(res, HttpStatus.FORBIDDEN, "Your role (" + u.role + ") is not allowed to do this");
            return false;
        }
        req.setAttribute("user", u);
        return true;
    }

    private void deny(HttpServletResponse res, HttpStatus st, String msg) throws Exception {
        res.setStatus(st.value());
        res.setContentType("application/json");
        res.getWriter().write("{\"status\":" + st.value() + ",\"error\":\"" + st.getReasonPhrase() + "\",\"message\":\"" + msg + "\"}");
    }
}
