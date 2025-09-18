-- Schema for payroll backend (PostgreSQL)

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  company_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(100) NOT NULL,
  contract TEXT NOT NULL CHECK (contract IN ('CDI','CDD','Stage')),
  salary_cfa BIGINT,
  salary_usd NUMERIC(12,2),
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  amount_cfa BIGINT NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','processing')),
  reference VARCHAR(50) NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'salary' CHECK (type IN ('salary','bonus','overtime','custom')),
  payment_month CHAR(7) GENERATED ALWAYS AS (to_char(date, 'YYYY-MM')) STORED,
  salary_month CHAR(7) GENERATED ALWAYS AS (CASE WHEN COALESCE(type,'salary')='salary' THEN to_char(date, 'YYYY-MM') ELSE NULL END) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_payments_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_salary_employee_month ON payments(employee_id, salary_month);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  "key" VARCHAR(100) PRIMARY KEY,
  "value" TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
