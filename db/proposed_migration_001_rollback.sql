USE bank_system;
DROP TRIGGER IF EXISTS trg_audit_log_no_update;
DROP TRIGGER IF EXISTS trg_audit_log_no_delete;
DROP TRIGGER IF EXISTS trg_transactions_no_update;
DROP TRIGGER IF EXISTS trg_transactions_no_delete;
ALTER TABLE accounts DROP CONSTRAINT chk_accounts_balance_nonneg;
ALTER TABLE transactions DROP CONSTRAINT chk_transactions_amount_pos;
