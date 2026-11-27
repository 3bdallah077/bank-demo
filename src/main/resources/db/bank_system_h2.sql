-- bank_system schema for H2 (embedded, file-based) — Windows one-click demo
-- Mirrors db/bank_system_sample.sql (same tables, columns, sample rows).
-- Differences from the MySQL dump: no ENUM/JSON/TIMESTAMP ON UPDATE/ENGINE clauses,
-- booleans are BOOLEAN, money is DECIMAL(15,2).

CREATE TABLE IF NOT EXISTS users (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  username              VARCHAR(100) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(200) NOT NULL,
  email                 VARCHAR(255),
  role                  VARCHAR(10)  NOT NULL DEFAULT 'CUSTOMER',
  is_locked             BOOLEAN      DEFAULT FALSE,
  failed_login_attempts INT          DEFAULT 0,
  lock_until            TIMESTAMP,
  is_active             BOOLEAN      DEFAULT TRUE,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_number VARCHAR(30) NOT NULL UNIQUE,
  user_id        BIGINT NOT NULL,
  balance        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  currency       VARCHAR(3) DEFAULT 'EGP',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id     BIGINT NOT NULL,
  amount         DECIMAL(15,2) NOT NULL,
  type           VARCHAR(20) NOT NULL,
  status         VARCHAR(10) DEFAULT 'PENDING',
  description    VARCHAR(500),
  reference_id   BIGINT,
  failure_reason VARCHAR(500),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by     BIGINT NOT NULL,
  ip_address     VARCHAR(45),
  CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_user    FOREIGN KEY (created_by) REFERENCES users (id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT,
  action         VARCHAR(50) NOT NULL,
  old_values     CLOB,
  new_values     CLOB,
  performed_by   BIGINT NOT NULL,
  performed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address     VARCHAR(45),
  CONSTRAINT fk_audit_tx   FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (performed_by)   REFERENCES users (id)        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_id   BIGINT NOT NULL UNIQUE,
  threshold_amount DECIMAL(15,2) NOT NULL,
  is_reviewed      BOOLEAN DEFAULT FALSE,
  reviewed_by      BIGINT,
  reviewed_at      TIMESTAMP,
  notes            CLOB,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_flag_tx   FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_flag_user FOREIGN KEY (reviewed_by)    REFERENCES users (id)        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_date       DATE NOT NULL UNIQUE,
  total_deposits    DECIMAL(15,2) DEFAULT 0.00,
  total_withdrawals DECIMAL(15,2) DEFAULT 0.00,
  total_transfers   DECIMAL(15,2) DEFAULT 0.00,
  transaction_count INT DEFAULT 0,
  generated_by      BIGINT,
  generated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  report_data       CLOB,
  CONSTRAINT fk_report_user FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Sample data (same as the classroom sample dump; all fictional)
-- Password for all five users is Demo@1234 (BCrypt hash from db/demo-passwords.sql)
-- ---------------------------------------------------------------------------
MERGE INTO users (id, username, password_hash, full_name, email, role, is_locked, failed_login_attempts, lock_until, is_active) KEY (id) VALUES
 (1,'customer1','$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu','Ahmed Mohamed','ahmed@example.com','CUSTOMER',FALSE,0,NULL,TRUE),
 (2,'teller1', '$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu','Omar Ali','omar@example.com','TELLER',FALSE,0,NULL,TRUE),
 (3,'manager1','$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu','Fatima Hassan','fatima@example.com','MANAGER',FALSE,0,NULL,TRUE),
 (4,'admin1',  '$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu','System Administrator','admin@example.com','ADMIN',FALSE,0,NULL,TRUE),
 (5,'auditor1','$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu','Compliance Officer','auditor@example.com','AUDITOR',FALSE,0,NULL,TRUE);

MERGE INTO accounts (id, account_number, user_id, balance, currency, is_active) KEY (id) VALUES
 (1,'EGP-001-1234567890',1,5000.00,'EGP',TRUE),
 (2,'EGP-002-0987654321',1,3000.00,'EGP',TRUE),
 (3,'EGP-003-5555555555',2,10000.00,'EGP',TRUE);

MERGE INTO transactions (id, account_id, amount, type, status, description, reference_id, failure_reason, created_at, created_by, ip_address) KEY (id) VALUES
 (1,1,1000.00,'DEPOSIT','COMPLETED','Initial deposit',NULL,NULL,TIMESTAMP '2026-11-18 00:19:40',1,'127.0.0.1'),
 (2,1,500.00,'WITHDRAW','COMPLETED','Cash withdrawal',NULL,NULL,TIMESTAMP '2026-11-18 00:19:40',1,'127.0.0.1'),
 (3,1,200.00,'TRANSFER_OUT','COMPLETED','Transfer to EGP-002-0987654321',NULL,NULL,TIMESTAMP '2026-11-18 00:19:40',1,'127.0.0.1'),
 (4,2,200.00,'TRANSFER_IN','COMPLETED','Transfer from EGP-001-1234567890',3,NULL,TIMESTAMP '2026-11-18 00:19:40',1,'127.0.0.1'),
 (5,1,10000.00,'WITHDRAW','FAILED','Attempted large withdrawal',NULL,'Insufficient funds. Available: 5500.00, Requested: 10000.00',TIMESTAMP '2026-11-18 00:19:40',1,'127.0.0.1');

MERGE INTO audit_log (id, transaction_id, action, old_values, new_values, performed_by, performed_at, ip_address) KEY (id) VALUES
 (1,1,'INSERT',NULL,'{"type": "DEPOSIT", "amount": 1000.0, "account_id": 1}',1,TIMESTAMP '2026-11-18 00:19:40','127.0.0.1'),
 (2,2,'INSERT',NULL,'{"type": "WITHDRAW", "amount": 500.0, "account_id": 1}',1,TIMESTAMP '2026-11-18 00:19:40','127.0.0.1');

MERGE INTO fraud_flags (id, transaction_id, threshold_amount, is_reviewed, reviewed_by, reviewed_at, notes, created_at) KEY (id) VALUES
 (1,1,1000.00,FALSE,NULL,NULL,NULL,TIMESTAMP '2026-11-18 00:19:40');

MERGE INTO daily_reports (id, report_date, total_deposits, total_withdrawals, total_transfers, transaction_count, generated_by, generated_at, report_data) KEY (id) VALUES
 (1,DATE '2026-11-18',1000.00,500.00,200.00,4,3,TIMESTAMP '2026-11-18 00:19:40',NULL);
