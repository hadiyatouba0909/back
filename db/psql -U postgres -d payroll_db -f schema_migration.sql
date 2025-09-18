-- ================================
-- SCHÉMA COMPLET POSTGRESQL
-- ================================
export PGPASSWORD='Neneba1234@' && psql -U postgres -h 127.0.0.1 -p 5432 -d payroll -f migration_complete.sql
-- Companies
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    company_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(100) NOT NULL,
    contract VARCHAR(20) CHECK (contract IN ('CDI','CDD','Stage')) NOT NULL,
    salary_cfa BIGINT,
    salary_usd DECIMAL(12,2),
    start_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Index pour employees
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    amount_cfa BIGINT NOT NULL,
    amount_usd DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('paid','pending','processing')) NOT NULL DEFAULT 'paid',
    reference VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) CHECK (type IN ('salary','bonus','overtime','custom')) NOT NULL DEFAULT 'salary',
    payment_month CHAR(7) GENERATED ALWAYS AS (TO_CHAR(date, 'YYYY-MM')) STORED,
    salary_month CHAR(7) GENERATED ALWAYS AS (
        CASE WHEN COALESCE(type,'salary') = 'salary' 
        THEN TO_CHAR(date, 'YYYY-MM') 
        ELSE NULL END
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Index pour payments
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_salary_employee_month ON payments(employee_id, salary_month);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- FONCTION POUR METTRE À JOUR updated_at
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- SCRIPT DE NETTOYAGE DES DOUBLONS
-- ================================

-- Résoudre les doublons pour les paiements de salaire par (employee, month)
-- Politique: Garder le plus récent (max created_at, sinon max id) et convertir les autres en type='custom'

-- Étape 1: Identifier les doublons et garder les plus récents
WITH salary_duplicates AS (
    SELECT 
        employee_id,
        TO_CHAR(date, 'YYYY-MM') as month,
        MAX(created_at) as max_created
    FROM payments
    WHERE COALESCE(type, 'salary') = 'salary'
    GROUP BY employee_id, TO_CHAR(date, 'YYYY-MM')
    HAVING COUNT(*) > 1
),
rows_to_keep AS (
    SELECT DISTINCT ON (p.employee_id, TO_CHAR(p.date, 'YYYY-MM')) 
        p.id
    FROM payments p
    INNER JOIN salary_duplicates sd ON 
        p.employee_id = sd.employee_id 
        AND TO_CHAR(p.date, 'YYYY-MM') = sd.month
        AND p.created_at = sd.max_created
    WHERE COALESCE(p.type, 'salary') = 'salary'
    ORDER BY p.employee_id, TO_CHAR(p.date, 'YYYY-MM'), p.id DESC
)
-- Étape 2: Convertir les doublons en 'custom'
UPDATE payments 
SET type = 'custom'
WHERE id IN (
    SELECT p.id 
    FROM payments p
    WHERE COALESCE(p.type, 'salary') = 'salary'
    AND EXISTS (
        SELECT 1 
        FROM payments q 
        WHERE q.employee_id = p.employee_id
        AND COALESCE(q.type, 'salary') = 'salary'
        AND TO_CHAR(q.date, 'YYYY-MM') = TO_CHAR(p.date, 'YYYY-MM')
        AND q.id != p.id
    )
    AND p.id NOT IN (SELECT id FROM rows_to_keep)
);

-- ================================
-- VÉRIFICATION DES DOUBLONS RESTANTS
-- ================================
SELECT 
    employee_id, 
    TO_CHAR(date, 'YYYY-MM') as month, 
    COUNT(*) as count
FROM payments
WHERE COALESCE(type, 'salary') = 'salary'
GROUP BY employee_id, TO_CHAR(date, 'YYYY-MM')
HAVING COUNT(*) > 1;