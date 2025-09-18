-- ================================
-- SCRIPT DE VÉRIFICATION ET MIGRATION IDEMPOTENTE
-- ================================

-- Fonction utilitaire pour ajouter des colonnes si elles n'existent pas
export PGPASSWORD='Neneba1234@' && psql -U postgres -h 127.0.0.1 -p 5432 -d payroll -f migration_complete.sql
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name TEXT, 
    column_name TEXT, 
    column_definition TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = add_column_if_not_exists.table_name 
        AND column_name = add_column_if_not_exists.column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
        RAISE NOTICE 'Added column % to table %', column_name, table_name;
    ELSE
        RAISE NOTICE 'Column % already exists in table %', column_name, table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Ajouter les colonnes manquantes si nécessaire
SELECT add_column_if_not_exists('payments', 'type', 'VARCHAR(20) CHECK (type IN (''salary'',''bonus'',''overtime'',''custom'')) NOT NULL DEFAULT ''salary''');
SELECT add_column_if_not_exists('payments', 'payment_month', 'CHAR(7) GENERATED ALWAYS AS (TO_CHAR(date, ''YYYY-MM'')) STORED');
SELECT add_column_if_not_exists('payments', 'salary_month', 'CHAR(7) GENERATED ALWAYS AS (CASE WHEN COALESCE(type,''salary'') = ''salary'' THEN TO_CHAR(date, ''YYYY-MM'') ELSE NULL END) STORED');

-- Vérifier les doublons avant de créer l'index unique
DO $$
DECLARE
    duplicate_count INTEGER;
    index_exists BOOLEAN;
BEGIN
    -- Compter les doublons
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT employee_id, TO_CHAR(date, 'YYYY-MM') as month
        FROM payments
        WHERE COALESCE(type, 'salary') = 'salary'
        GROUP BY employee_id, TO_CHAR(date, 'YYYY-MM')
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Vérifier si l'index existe
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND indexname = 'uniq_salary_employee_month'
    ) INTO index_exists;
    
    -- Créer l'index si pas de doublons et index n'existe pas
    IF duplicate_count = 0 AND NOT index_exists THEN
        CREATE UNIQUE INDEX uniq_salary_employee_month ON payments(employee_id, salary_month);
        RAISE NOTICE 'Created unique index uniq_salary_employee_month';
    ELSIF index_exists THEN
        RAISE NOTICE 'Index uniq_salary_employee_month already exists';
    ELSE
        RAISE NOTICE 'Cannot create unique index: % duplicate salary rows found', duplicate_count;
    END IF;
END $$;

-- ================================
-- RAPPORT DE STATUS
-- ================================

-- Afficher la structure des colonnes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
AND column_name IN ('type', 'payment_month', 'salary_month')
ORDER BY ordinal_position;

-- Afficher les index
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'payments'
AND indexname LIKE '%salary%';

-- Compter les doublons restants
SELECT 
    'Duplicate salary payments' as check_type,
    COUNT(*) as count
FROM (
    SELECT employee_id, TO_CHAR(date, 'YYYY-MM') as month
    FROM payments
    WHERE COALESCE(type, 'salary') = 'salary'
    GROUP BY employee_id, TO_CHAR(date, 'YYYY-MM')
    HAVING COUNT(*) > 1
) duplicates;

-- Nettoyage
DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);