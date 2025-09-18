import { Router } from 'express';
import db from '../utils/db.js';
const { query } = db;
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Fonction utilitaire pour valider les dates d'embauche
function validateEmploymentDate(paymentDate, employee) {
  const paymentDateObj = new Date(paymentDate);
  
  // Déterminer la date de début d'emploi
  let employeeStartDate;
  if (employee.start_date) {
    employeeStartDate = new Date(employee.start_date);
  } else {
    employeeStartDate = new Date(employee.created_at);
  }

  // Validation de base
  if (paymentDateObj < employeeStartDate) {
    const startDateStr = employeeStartDate.toLocaleDateString('fr-FR');
    const paymentDateStr = paymentDateObj.toLocaleDateString('fr-FR');
    
    return {
      isValid: false,
      error: `Impossible de créer un paiement pour le ${paymentDateStr}. L'employé ${employee.name || 'cet employé'} a été embauché le ${startDateStr}.`
    };
  }

  // Validation spécifique pour les salaires mensuels
  const paymentYear = paymentDateObj.getFullYear();
  const paymentMonth = paymentDateObj.getMonth();
  const startYear = employeeStartDate.getFullYear();
  const startMonth = employeeStartDate.getMonth();

  // Si c'est un paiement pour un mois antérieur à l'embauche
  if (paymentYear < startYear || (paymentYear === startYear && paymentMonth < startMonth)) {
    const startMonthStr = employeeStartDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    const paymentMonthStr = paymentDateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    
    return {
      isValid: false,
      error: `Impossible de payer le salaire de ${paymentMonthStr}. L'employé ${employee.name || 'cet employé'} a été embauché en ${startMonthStr}.`
    };
  }

  return { isValid: true };
}

// Fonction utilitaire pour déterminer le statut automatique
function determinePaymentStatus(paymentDate, requestedStatus) {
  const today = new Date();
  const paymentDateObj = new Date(paymentDate);
  
  // Normaliser les dates pour comparer seulement les jours (sans l'heure)
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const paymentDateNormalized = new Date(paymentDateObj.getFullYear(), paymentDateObj.getMonth(), paymentDateObj.getDate());
  
  // Si la date de paiement est dans le futur, forcer le statut "pending"
  if (paymentDateNormalized > todayNormalized) {
    return 'pending';
  }
  
  // Sinon, utiliser le statut demandé ou "paid" par défaut
  return requestedStatus || 'paid';
}

// Dans votre fichier de routes (ex: routes/payments.js)
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { search, employeeId, month } = req.query;

    let monthsList = [];
    if (req.query.months) {
      const raw = Array.isArray(req.query.months) ? req.query.months : [req.query.months];
      monthsList = raw
        .flatMap((m) => String(m).split(','))
        .map((m) => m.trim())
        .filter((m) => m);
    }
    if (month) monthsList.push(String(month));

    if (monthsList.length > 0) {
      for (const m of monthsList) {
        if (!/^\d{4}-\d{2}$/.test(m)) {
          return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
        }
      }
    }

    let whereClause = 'WHERE e.company_id = :company_id';
    const params = { company_id: req.user.company_id };

    if (employeeId) {
      whereClause += ' AND p.employee_id = :employee_id';
      params.employee_id = employeeId;
    }

    if (monthsList.length === 1) {
      whereClause += " AND to_char(p.date, 'YYYY-MM') = :m0";
      params.m0 = monthsList[0];
    } else if (monthsList.length > 1) {
      const names = monthsList.map((_, i) => `:m${i}`).join(', ');
      whereClause += ` AND to_char(p.date, 'YYYY-MM') IN (${names})`;
      monthsList.forEach((m, i) => (params[`m${i}`] = m));
    }

    if (search) {
      whereClause += `
        AND (
          e.name LIKE :search_term OR
          e.email LIKE :search_term OR
          e.phone LIKE :search_term OR
          p.reference LIKE :search_term
        )
      `;
      params.search_term = `%${search}%`;
    }

    const sql = `
      SELECT 
        p.*, 
        e.name as employee_name, 
        e.position as employee_position,
        e.email as employee_email,
        e.phone as employee_phone,
        COALESCE(p.type, 'salary') as type
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      ${whereClause}
      ORDER BY p.date DESC, p.created_at DESC
    `;

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Aussi, mise à jour de la route POST pour accepter le type
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { employeeId, amountCFA, amountUSD, date, status, type } = req.body;
    if (!employeeId || !amountCFA || !amountUSD || !date) {
      return res.status(400).json({ error: 'employeeId, amountCFA, amountUSD and date are required' });
    }

    const employeeCheck = await query(
      'SELECT id, name, start_date, created_at FROM employees WHERE id = :employee_id AND company_id = :company_id',
      { employee_id: employeeId, company_id: req.user.company_id }
    );

    if (employeeCheck.length === 0) {
      return res.status(404).json({ error: 'Employee not found or not accessible' });
    }

    const employee = employeeCheck[0];
    
    // Validation améliorée des dates d'embauche
    const dateValidation = validateEmploymentDate(date, employee);
    if (!dateValidation.isValid) {
      return res.status(400).json({ error: dateValidation.error });
    }

    // Détermination automatique du statut
    const finalStatus = determinePaymentStatus(date, status);

    const effectiveType = type || 'salary';

    if (effectiveType === 'salary') {
      const paymentDateObj = new Date(date);
      const yyyy = paymentDateObj.getFullYear();
      const mm = String(paymentDateObj.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;

      const dup = await query(
        `SELECT p.id FROM payments p
         LEFT JOIN employees e ON e.id = p.employee_id
         WHERE p.employee_id = :employee_id AND e.company_id = :company_id
         AND COALESCE(p.type,'salary') = 'salary'
         AND to_char(p.date, 'YYYY-MM') = :month
         LIMIT 1`,
        { employee_id: employeeId, company_id: req.user.company_id, month: monthKey }
      );

      if (dup.length > 0) {
        const monthStr = paymentDateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        return res.status(409).json({ 
          error: `Un paiement de salaire existe déjà pour ${employee.name || 'cet employé'} pour le mois de ${monthStr}` 
        });
      }
    }

    const year = new Date(date).getFullYear();
    let reference;
    let attempts = 0;

    while (attempts < 3) {
      const [{ maxRef }] = await query(
        "SELECT COALESCE(MAX(CAST(split_part(reference, '-', 3) AS INTEGER)), 0) AS "maxRef" FROM payments WHERE reference LIKE :prefix",
        { prefix: `PAY-${year}-%` }
      );

      const next = Number(maxRef) + 1;
      const refNumber = String(next).padStart(3, '0');
      reference = `PAY-${year}-${refNumber}`;

      try {
        const result = await query(
          `INSERT INTO payments (employee_id, amount_cfa, amount_usd, date, status, reference, type)
           VALUES (:employee_id, :amount_cfa, :amount_usd, :date, :status, :reference, :type)
           RETURNING id`,
          {
            employee_id: employeeId,
            amount_cfa: amountCFA,
            amount_usd: amountUSD,
            date,
            status: finalStatus,
            reference,
            type: effectiveType
          }
        );

        return res.status(201).json({
          id: result.insertId,
          ...req.body,
          status: finalStatus,
          reference,
          type: effectiveType
        });
      } catch (e) {
        if (e && (e.code === 'ER_DUP_ENTRY' || e.code === '23505')) {
          attempts += 1;
          continue;
        }
        throw e;
      }
    }

    return res.status(409).json({ error: 'Could not generate unique payment reference, please retry' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { amountCFA, amountUSD, date, status, type } = req.body;

    const existingRows = await query(
      `SELECT p.id, p.employee_id, p.date, COALESCE(p.type,'salary') as type, e.company_id, e.name, e.start_date, e.created_at
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.id = :id`,
      { id: req.params.id }
    );
    if (existingRows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const existing = existingRows[0];
    if (existing.company_id !== req.user.company_id) return res.status(404).json({ error: 'Payment not found' });

    const candidateType = type || existing.type;
    const candidateDate = date || existing.date;

    // Validation des dates d'embauche si la date change
    if (date && date !== existing.date) {
      const employee = {
        name: existing.name,
        start_date: existing.start_date,
        created_at: existing.created_at
      };
      
      const dateValidation = validateEmploymentDate(candidateDate, employee);
      if (!dateValidation.isValid) {
        return res.status(400).json({ error: dateValidation.error });
      }
    }

    if (candidateType === 'salary' && candidateDate) {
      const d = new Date(candidateDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      const dup = await query(
        `SELECT p.id FROM payments p
         LEFT JOIN employees e ON e.id = p.employee_id
         WHERE e.company_id = :company_id AND p.employee_id = :employee_id AND p.id <> :id
           AND COALESCE(p.type,'salary') = 'salary'
           AND to_char(p.date, 'YYYY-MM') = :month
         LIMIT 1`,
        { company_id: req.user.company_id, employee_id: existing.employee_id, id: req.params.id, month: monthKey }
      );
      if (dup.length > 0) {
        const monthStr = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        return res.status(409).json({ 
          error: `Un paiement de salaire existe déjà pour ${existing.name || 'cet employé'} pour le mois de ${monthStr}` 
        });
      }
    }

    // Détermination automatique du statut si la date change
    const finalStatus = date ? determinePaymentStatus(candidateDate, status) : (status || existing.status);

    const result = await query(
      `UPDATE payments p
       SET amount_cfa = COALESCE(:amount_cfa, p.amount_cfa), 
           amount_usd = COALESCE(:amount_usd, p.amount_usd),
           date = COALESCE(:date, p.date), 
           status = COALESCE(:status, p.status),
           type = COALESCE(:type, p.type) 
       FROM employees e
       WHERE e.id = p.employee_id AND p.id = :id AND e.company_id = :company_id`,
      {
        id: req.params.id,
        company_id: req.user.company_id,
        amount_cfa: amountCFA || null,
        amount_usd: amountUSD || null,
        date: date || null,
        status: finalStatus,
        type: type || null
      }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
    const updated = await query('SELECT * FROM payments WHERE id = :id', { id: req.params.id });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM payments p
       USING employees e
       WHERE e.id = p.employee_id AND p.id = :id AND e.company_id = :company_id`,
      { id: req.params.id, company_id: req.user.company_id }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Route pour créer des paiements en lot (sélection multiple d'employés) - AMÉLIORÉE
router.post('/batch', authRequired, async (req, res, next) => {
  try {
    const { employeeIds, amountCFA, amountUSD, date, status, type } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'employeeIds array is required and must not be empty' });
    }

    if (!amountCFA || !amountUSD || !date) {
      return res.status(400).json({ error: 'amountCFA, amountUSD and date are required' });
    }

    // Vérifier que tous les employés appartiennent à la même entreprise et récupérer leurs données
    const employeeCheck = await query(
      'SELECT id, start_date, created_at, name FROM employees WHERE id IN (' +
      employeeIds.map(() => '?').join(',') + ') AND company_id = ?',
      [...employeeIds, req.user.company_id]
    );

    if (employeeCheck.length !== employeeIds.length) {
      return res.status(404).json({ error: 'Some employees not found or not accessible' });
    }

    // Détermination automatique du statut
    const finalStatus = determinePaymentStatus(date, status);
    const createdPayments = [];
    const errors = [];

    for (const employee of employeeCheck) {
      try {
        // Validation améliorée des dates d'embauche
        const dateValidation = validateEmploymentDate(date, employee);
        if (!dateValidation.isValid) {
          errors.push({
            employeeId: employee.id,
            employeeName: employee.name,
            error: dateValidation.error
          });
          continue;
        }

        const effectiveType = type || 'salary';
        if (effectiveType === 'salary') {
          const paymentDateObj = new Date(date);
          const yyyy = paymentDateObj.getFullYear();
          const mm = String(paymentDateObj.getMonth() + 1).padStart(2, '0');
          const monthKey = `${yyyy}-${mm}`;
          const dup = await query(
            `SELECT p.id FROM payments p
             WHERE p.employee_id = :employee_id
               AND COALESCE(p.type,'salary') = 'salary'
               AND to_char(p.date, 'YYYY-MM') = :month
             LIMIT 1`,
            { employee_id: employee.id, month: monthKey }
          );
          if (dup.length > 0) {
            const monthStr = paymentDateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
            errors.push({
              employeeId: employee.id,
              employeeName: employee.name,
              error: `Un paiement de salaire existe déjà pour ${employee.name} pour le mois de ${monthStr}`
            });
            continue;
          }
        }

        const year = new Date(date).getFullYear();
        let reference;
        let attempts = 0;

        while (attempts < 3) {
          const [{ maxRef }] = await query(
            "SELECT COALESCE(MAX(CAST(split_part(reference, '-', 3) AS INTEGER)), 0) AS "maxRef" FROM payments WHERE reference LIKE :prefix",
            { prefix: `PAY-${year}-%` }
          );
          const next = Number(maxRef) + 1;
          const refNumber = String(next).padStart(3, '0');
          reference = `PAY-${year}-${refNumber}`;

          try {
            const result = await query(
              `INSERT INTO payments (employee_id, amount_cfa, amount_usd, date, status, reference, type)
               VALUES (:employee_id, :amount_cfa, :amount_usd, :date, :status, :reference, :type)
               RETURNING id`,
              {
                employee_id: employee.id,
                amount_cfa: amountCFA,
                amount_usd: amountUSD,
                date,
                status: finalStatus,
                reference,
                type: effectiveType
              }
            );

            createdPayments.push({
              id: result.insertId,
              employeeId: employee.id,
              employeeName: employee.name,
              reference,
              amountCFA,
              amountUSD,
              date,
              status: finalStatus,
              type: effectiveType
            });
            break;
          } catch (e) {
            if (e && (e.code === 'ER_DUP_ENTRY' || e.code === '23505')) {
              attempts += 1;
              continue;
            }
            throw e;
          }
        }

        if (attempts >= 3) {
          errors.push({
            employeeId: employee.id,
            employeeName: employee.name,
            error: 'Could not generate unique payment reference'
          });
        }

      } catch (e) {
        errors.push({
          employeeId: employee.id,
          employeeName: employee.name,
          error: e.message || 'Unknown error'
        });
      }
    }

    // Retourner les résultats
    const response = {
      success: createdPayments.length > 0,
      createdPayments,
      errors,
      summary: {
        total: employeeIds.length,
        created: createdPayments.length,
        failed: errors.length
      }
    };

    if (errors.length > 0 && createdPayments.length === 0) {
      return res.status(400).json(response);
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;

