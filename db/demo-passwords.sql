-- Demo data helper (NOT a schema change). The sample dump's BCrypt hash has an unknown plaintext,
-- so this sets a known classroom password "Demo@1234" for the 5 sample users. Fictional accounts only.
USE bank_system;
UPDATE users SET password_hash='$2a$10$b24cg2.cJjqCf.raVOnwRewwJvFYp8Ekx8.PW1fzY2ixtzwF.8gfu', failed_login_attempts=0, is_locked=0, lock_until=NULL
 WHERE username IN ('customer1','teller1','manager1','admin1','auditor1');
