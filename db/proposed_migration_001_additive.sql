-- PROPOSED additive migration (NOT required to run the app; the app works on the original schema).
-- Purpose: enforce in the database what the app already enforces in code.
-- Only adds CHECK constraints and triggers. No column or table is changed, dropped or renamed.
-- Review it with your instructor before applying. Roll back with db/proposed_migration_001_rollback.sql
USE bank_system;

-- NFR-11 / US-04: balance can never be negative, amounts are always positive
ALTER TABLE accounts     ADD CONSTRAINT chk_accounts_balance_nonneg CHECK (balance >= 0);
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_pos CHECK (amount > 0);

-- NFR-10: audit log cannot be edited or deleted by any role (including direct SQL users)
DELIMITER $$
CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON audit_log
FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is immutable (NFR-10)';
END$$
CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON audit_log
FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is immutable (NFR-10)';
END$$

-- NFR-10 / FR-07: transactions are append-only. The single allowed update is linking the two
-- legs of a transfer once (reference_id NULL -> value), which the application does.
CREATE TRIGGER trg_transactions_no_delete BEFORE DELETE ON transactions
FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'transactions are immutable (NFR-10)';
END$$
CREATE TRIGGER trg_transactions_no_update BEFORE UPDATE ON transactions
FOR EACH ROW BEGIN
  IF NOT (OLD.reference_id IS NULL AND NEW.reference_id IS NOT NULL
          AND NEW.account_id = OLD.account_id AND NEW.amount = OLD.amount AND NEW.type = OLD.type
          AND NEW.status = OLD.status AND NEW.created_by = OLD.created_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'transactions are immutable (NFR-10)';
  END IF;
END$$
DELIMITER ;
