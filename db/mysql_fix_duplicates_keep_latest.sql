-- Resolve duplicates for salary payments per (employee, month)
-- Policy: Keep the most recent (max created_at, else max id) and convert others to type='custom'
-- Safe to run multiple times.

USE `payroll`;

-- Temporary table for rows to keep
DROP TEMPORARY TABLE IF EXISTS tmp_keep;
CREATE TEMPORARY TABLE tmp_keep (
  id BIGINT PRIMARY KEY
) ENGINE=Memory;

INSERT INTO tmp_keep (id)
SELECT p.id
FROM payments p
JOIN (
  SELECT employee_id, DATE_FORMAT(`date`,'%Y-%m') AS m, MAX(created_at) AS max_created
  FROM payments
  WHERE COALESCE(`type`,'salary')='salary'
  GROUP BY employee_id, m
) t ON t.employee_id = p.employee_id AND t.m = DATE_FORMAT(p.`date`,'%Y-%m') AND p.created_at = t.max_created
WHERE COALESCE(p.`type`,'salary')='salary';

-- If ties on created_at, choose max id among ties
-- Recompute keep set to ensure single keeper per (employee, month)
DROP TEMPORARY TABLE IF EXISTS tmp_keep2;
CREATE TEMPORARY TABLE tmp_keep2 (
  id BIGINT PRIMARY KEY
) ENGINE=Memory;

INSERT INTO tmp_keep2 (id)
SELECT p2.id
FROM (
  SELECT employee_id, DATE_FORMAT(`date`,'%Y-%m') AS m, MAX(id) AS max_id
  FROM payments
  WHERE COALESCE(`type`,'salary')='salary'
  GROUP BY employee_id, m
) x
JOIN payments p2 ON p2.id = x.max_id;

-- Convert duplicates (salary) not in keep set to custom
UPDATE payments p
JOIN (
  SELECT p.id
  FROM payments p
  WHERE COALESCE(p.`type`,'salary')='salary'
    AND EXISTS (
      SELECT 1 FROM payments q
      WHERE q.employee_id = p.employee_id
        AND COALESCE(q.`type`,'salary')='salary'
        AND DATE_FORMAT(q.`date`,'%Y-%m') = DATE_FORMAT(p.`date`,'%Y-%m')
        AND q.id <> p.id
    )
) dups ON dups.id = p.id
LEFT JOIN tmp_keep2 k ON k.id = p.id
SET p.type = 'custom'
WHERE k.id IS NULL;

-- Report remaining duplicates (should be zero)
SELECT employee_id, DATE_FORMAT(`date`,'%Y-%m') AS month, COUNT(*) c
FROM payments
WHERE COALESCE(`type`,'salary')='salary'
GROUP BY employee_id, month
HAVING c>1;