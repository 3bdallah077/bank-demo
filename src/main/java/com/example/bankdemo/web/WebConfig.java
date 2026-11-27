package com.example.bankdemo.web;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AuthInterceptor auth;
    public WebConfig(AuthInterceptor auth) { this.auth = auth; }

    @Override
    public void addInterceptors(InterceptorRegistry r) { r.addInterceptor(auth).addPathPatterns("/api/**"); }

    /** NFR-03: defence in depth against XSS (the UI also never uses innerHTML for data). */
    @Bean
    public OncePerRequestFilter securityHeaders() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest q, HttpServletResponse s, FilterChain c) throws java.io.IOException, javax.servlet.ServletException {
                s.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
                s.setHeader("X-Content-Type-Options", "nosniff");
                s.setHeader("X-Frame-Options", "DENY");
                if (q.getRequestURI().startsWith("/api/")) s.setHeader("Cache-Control", "no-store");
                c.doFilter(q, s);
            }
        };
    }
}
