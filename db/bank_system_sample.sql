CREATE DATABASE  IF NOT EXISTS `bank_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `bank_system`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: bank_system
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable account number (FR-10, US-07)',
  `user_id` bigint NOT NULL COMMENT 'Foreign key to users table',
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Account balance - exact precision (NFR-11)',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'EGP' COMMENT 'ISO currency code',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Account active status',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `idx_account_number` (`account_number`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Accounts table for banking operations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,'EGP-001-1234567890',1,5000.00,'EGP',1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(2,'EGP-002-0987654321',1,3000.00,'EGP',1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(3,'EGP-003-5555555555',2,10000.00,'EGP',1,'2026-11-18 00:19:40','2026-11-18 00:19:40');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint DEFAULT NULL COMMENT 'Foreign key to transactions table (FR-07)',
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action type: INSERT, UPDATE, DELETE',
  `old_values` json DEFAULT NULL COMMENT 'JSON of old values (for UPDATE/DELETE)',
  `new_values` json DEFAULT NULL COMMENT 'JSON of new values (for INSERT/UPDATE)',
  `performed_by` bigint NOT NULL COMMENT 'Foreign key to users table (who performed the action)',
  `performed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action was performed',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Client IP address (for audit trail - NFR-10)',
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_performed_by` (`performed_by`),
  KEY `idx_performed_at` (`performed_at`),
  KEY `idx_action` (`action`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_log_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutable audit log - records all actions for compliance (NFR-10)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,1,'INSERT',NULL,'{\"type\": \"DEPOSIT\", \"amount\": 1000.0, \"account_id\": 1}',1,'2026-11-18 00:19:40','127.0.0.1'),(2,2,'INSERT',NULL,'{\"type\": \"WITHDRAW\", \"amount\": 500.0, \"account_id\": 1}',1,'2026-11-18 00:19:40','127.0.0.1');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_reports`
--

DROP TABLE IF EXISTS `daily_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_date` date NOT NULL COMMENT 'Date of the report (FR-11)',
  `total_deposits` decimal(15,2) DEFAULT '0.00' COMMENT 'Total deposits for the day (NFR-11)',
  `total_withdrawals` decimal(15,2) DEFAULT '0.00' COMMENT 'Total withdrawals for the day (NFR-11)',
  `total_transfers` decimal(15,2) DEFAULT '0.00' COMMENT 'Total transfers for the day (NFR-11)',
  `transaction_count` int DEFAULT '0' COMMENT 'Total number of transactions for the day',
  `generated_by` bigint DEFAULT NULL COMMENT 'Foreign key to users table (manager who generated)',
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the report was generated',
  `report_data` json DEFAULT NULL COMMENT 'Extended report data (optional)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_date` (`report_date`),
  KEY `generated_by` (`generated_by`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_generated_at` (`generated_at`),
  CONSTRAINT `daily_reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily transaction reports for manager monitoring (FR-11)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_reports`
--

LOCK TABLES `daily_reports` WRITE;
/*!40000 ALTER TABLE `daily_reports` DISABLE KEYS */;
INSERT INTO `daily_reports` VALUES (1,'2026-11-18',1000.00,500.00,200.00,4,3,'2026-11-18 00:19:40',NULL);
/*!40000 ALTER TABLE `daily_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fraud_flags`
--

DROP TABLE IF EXISTS `fraud_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fraud_flags` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint NOT NULL COMMENT 'Foreign key to transactions table (UNIQUE - one flag per transaction)',
  `threshold_amount` decimal(15,2) NOT NULL COMMENT 'The configurable threshold that triggered this flag (FR-12)',
  `is_reviewed` tinyint(1) DEFAULT '0' COMMENT 'Whether the flag has been reviewed by a manager',
  `reviewed_by` bigint DEFAULT NULL COMMENT 'Foreign key to users table (manager who reviewed)',
  `reviewed_at` datetime DEFAULT NULL COMMENT 'When the flag was reviewed',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Review notes from manager',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the flag was created',
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_is_reviewed` (`is_reviewed`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_threshold_amount` (`threshold_amount`),
  CONSTRAINT `fraud_flags_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fraud_flags_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fraud flags - transactions above configurable threshold (FR-12)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fraud_flags`
--

LOCK TABLES `fraud_flags` WRITE;
/*!40000 ALTER TABLE `fraud_flags` DISABLE KEYS */;
INSERT INTO `fraud_flags` VALUES (1,1,1000.00,0,NULL,NULL,NULL,'2026-11-18 00:19:40');
/*!40000 ALTER TABLE `fraud_flags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL COMMENT 'Foreign key to accounts table (source/destination)',
  `amount` decimal(15,2) NOT NULL COMMENT 'Transaction amount - exact precision (NFR-11)',
  `type` enum('DEPOSIT','WITHDRAW','TRANSFER_IN','TRANSFER_OUT') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Transaction type (FR-07): DEPOSIT, WITHDRAW, TRANSFER_IN, TRANSFER_OUT',
  `status` enum('PENDING','COMPLETED','FAILED','REVERSED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' COMMENT 'Transaction status (FR-07): PENDING, COMPLETED, FAILED, REVERSED',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Transaction description/narration',
  `reference_id` bigint DEFAULT NULL COMMENT 'Linked transaction ID (for transfers - counterpart)',
  `failure_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Reason if transaction failed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Transaction creation timestamp (FR-07)',
  `created_by` bigint NOT NULL COMMENT 'Foreign key to users table (who initiated)',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Client IP address (for audit - NFR-10)',
  PRIMARY KEY (`id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_reference_id` (`reference_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transactions table - records all financial operations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,1,1000.00,'DEPOSIT','COMPLETED','Initial deposit',NULL,NULL,'2026-11-18 00:19:40',1,'127.0.0.1'),(2,1,500.00,'WITHDRAW','COMPLETED','Cash withdrawal',NULL,NULL,'2026-11-18 00:19:40',1,'127.0.0.1'),(3,1,200.00,'TRANSFER_OUT','COMPLETED','Transfer to EGP-002-0987654321',NULL,NULL,'2026-11-18 00:19:40',1,'127.0.0.1'),(4,2,200.00,'TRANSFER_IN','COMPLETED','Transfer from EGP-001-1234567890',3,NULL,'2026-11-18 00:19:40',1,'127.0.0.1'),(5,1,10000.00,'WITHDRAW','FAILED','Attempted large withdrawal',NULL,'Insufficient funds. Available: 5500.00, Requested: 10000.00','2026-11-18 00:19:40',1,'127.0.0.1');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Login username (FR-01)',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BCrypt hashed password (NFR-02)',
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User full name',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User email address',
  `role` enum('CUSTOMER','TELLER','MANAGER','ADMIN','AUDITOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CUSTOMER' COMMENT 'User role (FR-09): CUSTOMER, TELLER, MANAGER, ADMIN, AUDITOR',
  `is_locked` tinyint(1) DEFAULT '0' COMMENT 'Account locked after 3 failed attempts (FR-02)',
  `failed_login_attempts` int DEFAULT '0' COMMENT 'Consecutive failed login attempts counter (FR-02)',
  `lock_until` datetime DEFAULT NULL COMMENT 'When the account lock expires (FR-02)',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'User account active status (US-10)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_locked` (`is_locked`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Users table for authentication and authorization';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'customer1','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','Ahmed Mohamed','ahmed@example.com','CUSTOMER',0,0,NULL,1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(2,'teller1','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','Omar Ali','omar@example.com','TELLER',0,0,NULL,1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(3,'manager1','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','Fatima Hassan','fatima@example.com','MANAGER',0,0,NULL,1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(4,'admin1','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','System Administrator','admin@example.com','ADMIN',0,0,NULL,1,'2026-11-18 00:19:40','2026-11-18 00:19:40'),(5,'auditor1','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','Compliance Officer','auditor@example.com','AUDITOR',0,0,NULL,1,'2026-11-18 00:19:40','2026-11-18 00:19:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-26  8:47:37
