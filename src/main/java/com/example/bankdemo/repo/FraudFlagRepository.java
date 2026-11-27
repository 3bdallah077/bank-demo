package com.example.bankdemo.repo;

import com.example.bankdemo.model.FraudFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FraudFlagRepository extends JpaRepository<FraudFlag, Long> {
    List<FraudFlag> findAllByOrderByIdDesc();
}
