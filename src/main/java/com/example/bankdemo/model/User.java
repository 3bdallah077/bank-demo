package com.example.bankdemo.model;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(name = "username", nullable = false, length = 100)
    public String username;
    @Column(name = "password_hash", nullable = false, length = 255)
    public String passwordHash;
    @Column(name = "full_name", nullable = false, length = 200)
    public String fullName;
    @Column(name = "email", length = 255)
    public String email;
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, columnDefinition = "enum('CUSTOMER','TELLER','MANAGER','ADMIN','AUDITOR')")
    public Role role = Role.CUSTOMER;
    @Column(name = "is_locked")
    public Boolean locked = false;
    @Column(name = "failed_login_attempts")
    public Integer failedLoginAttempts = 0;
    @Column(name = "lock_until")
    public LocalDateTime lockUntil;
    @Column(name = "is_active")
    public Boolean active = true;
    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}
