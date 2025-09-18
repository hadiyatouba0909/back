INSERT INTO companies (name, address, email, phone) VALUES
('Saraya', 'Dakar, Sénégal', 'admin@saraya.com', '+221 77 123 45 67');

-- Default admin user: password = admin123 (to be hashed via app; seed does not include users)

INSERT INTO employees (company_id, name, email, phone, position, contract, salary_cfa, salary_usd, start_date) VALUES
(1, 'Jean Dupont', 'jean.dupont@saraya.com', '+33 6 12 34 56 78', 'Développeur Senior', 'CDI', 620000, 1000.00, '2023-01-15'),
(1, 'Marie Claire', 'marie.claire@saraya.com', '+33 6 87 65 43 21', 'Community Manager', 'CDD', 465000, 750.00, '2024-03-10'),
(1, 'Ahmed Sow', 'ahmed.sow@saraya.com', '+221 77 123 45 67', 'Stagiaire Développeur', 'Stage', 310000, 500.00, '2024-11-01'),
(1, 'Sophie Martin', 'sophie.martin@saraya.com', '+33 6 11 22 33 44', 'Designer UI/UX', 'CDI', 775000, 1250.00, '2023-06-20');

INSERT INTO payments (employee_id, amount_cfa, amount_usd, date, status, reference) VALUES
(1, 620000, 1000.00, '2025-01-15', 'paid', 'PAY-2025-001'),
(2, 465000, 750.00, '2025-01-15', 'paid', 'PAY-2025-002'),
(3, 310000, 500.00, '2025-01-16', 'pending', 'PAY-2025-003'),
(4, 775000, 1250.00, '2025-01-14', 'paid', 'PAY-2025-004');
