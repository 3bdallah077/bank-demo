package com.example.bankdemo.repo;

import com.example.bankdemo.model.Transaction;
import com.example.bankdemo.model.TxType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    @Query("select t from Transaction t where t.accountId = :acc " +
           "and (:from is null or t.createdAt >= :from) and (:to is null or t.createdAt < :to) " +
           "order by t.createdAt desc, t.id desc")
    List<Transaction> history(@Param("acc") Long accountId, @Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to, Pageable page);

    @Query("select t from Transaction t where (:from is null or t.createdAt >= :from) and (:to is null or t.createdAt < :to) " +
           "order by t.createdAt desc, t.id desc")
    List<Transaction> all(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable page);

    @Query("select coalesce(sum(t.amount),0) from Transaction t where t.type = :type and t.status = 'COMPLETED' " +
           "and t.createdAt >= :from and t.createdAt < :to")
    java.math.BigDecimal sumByType(@Param("type") TxType type, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** FR-11: the daily report counter counts the same rows as the sums (COMPLETED only), so both agree. */
    @Query("select count(t) from Transaction t where t.status = 'COMPLETED' and t.createdAt >= :from and t.createdAt < :to")
    long countCompletedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
