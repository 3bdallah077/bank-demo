package com.example.bankdemo.web;

import com.example.bankdemo.model.Role;
import java.lang.annotation.*;

/** Roles allowed to call the annotated endpoint (FR-09). No annotation = any logged-in user. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Roles {
    Role[] value();
}
