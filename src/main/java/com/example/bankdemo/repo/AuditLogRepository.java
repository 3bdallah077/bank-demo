package com.example.bankdemo.repo;

import com.example.bankdemo.model.AuditLog;
import org.springframework.data.repository.Repository;
import java.util.List;
import org.springframework.data.domain.Pageable;

/** Deliberately NOT a JpaRepository: only save (insert) and read are possible (NFR-10). */
public interface AuditLogRepository extends Repository<AuditLog, Long> {
    AuditLog save(AuditLog log);
    List<AuditLog> findAllByOrderByIdDesc(Pageable page);
}
