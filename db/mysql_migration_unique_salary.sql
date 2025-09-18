-- Idempotent migration: add type, payment_month, salary_month and unique index enforcing single salary per (employee, month)
-- Safe for MySQL 8.0+

USE `payroll`;

-- 1) Add column type if missing
SET @has_type := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'type'
);
SET @sql := IF(@has_type = 0,
  'ALTER TABLE payments ADD COLUMN type ENUM(''salary'',''bonus'',''overtime'',''custom'') NOT NULL DEFAULT ''salary'' AFTER reference',
  'SELECT ''skip: type exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Add generated payment_month column if missing
SET @has_pm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_month'
);
SET @sql := IF(@has_pm = 0,
  'ALTER TABLE payments ADD COLUMN payment_month CHAR(7) GENERATED ALWAYS AS (DATE_FORMAT(`date`, ''%Y-%m'')) STORED AFTER type',
  'SELECT ''skip: payment_month exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Add generated salary_month (only applies to salary) if missing
SET @has_sm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'salary_month'
);
SET @sql := IF(@has_sm = 0,
  'ALTER TABLE payments ADD COLUMN salary_month CHAR(7) GENERATED ALWAYS AS (IF(COALESCE(`type`,''salary'')=''salary'', DATE_FORMAT(`date`, ''%Y-%m''), NULL)) STORED AFTER payment_month',
  'SELECT ''skip: salary_month exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Check salary duplicates before creating unique index (only type=salary)
SET @dups := (
  SELECT COUNT(*) FROM (
    SELECT employee_id, DATE_FORMAT(`date`, '%Y-%m') AS m, COUNT(*) c
    FROM payments
    WHERE COALESCE(`type`,'salary') = 'salary'
    GROUP BY employee_id, m
    HAVING c > 1
  ) x
);

-- 5) Create unique index if no duplicates and index missing
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'uniq_salary_employee_month'
);
SET @sql := IF(@has_idx = 0 AND @dups = 0,
  'CREATE UNIQUE INDEX uniq_salary_employee_month ON payments(employee_id, salary_month)',
  'SELECT CONCAT(''skip: '', IF(@has_idx>0, ''index exists'', ''duplicates present''))');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Show current definition and duplicate count
SHOW COLUMNS FROM payments LIKE 'type';
SHOW COLUMNS FROM payments LIKE 'payment_month';
SHOW COLUMNS FROM payments LIKE 'salary_month';
SHOW INDEX FROM payments WHERE Key_name = 'uniq_salary_employee_month';
SELECT @dups AS duplicate_salary_rows;