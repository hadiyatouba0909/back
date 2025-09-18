import Payment from '../models/Payment.js';
import Employee from '../models/Employee.js';

class PaymentController {
  /**
   * Récupérer tous les paiements avec filtres
   */
  static async getAll(req, res, next) {
    try {
      const { search, employeeId, month } = req.query;

      // Traitement des mois
      let monthsList = [];
      if (req.query.months) {
        const raw = Array.isArray(req.query.months) ? req.query.months : [req.query.months];
        monthsList = raw
          .flatMap((m) => String(m).split(','))
          .map((m) => m.trim())
          .filter((m) => m);
      }
      if (month) monthsList.push(String(month));

      // Validation du format des mois
      if (monthsList.length > 0 && !Payment.validateMonthsFormat(monthsList)) {
        return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
      }

      const filters = {
        search,
        employeeId,
        months: monthsList
      };

      const payments = await Payment.findAll(req.user.company_id, filters);
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Créer un nouveau paiement
   */
  static async create(req, res, next) {
    try {
      const { employeeId, amountCFA, amountUSD, date, status, type } = req.body;
      
      // Validation des données
      const validation = Payment.validate({
        employee_id: employeeId,
        amount_cfa: amountCFA,
        amount_usd: amountUSD,
        date
      });
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }

      // Vérifier que l'employé existe et appartient à l'entreprise
      const employee = await Employee.findByIdAndCompanyId(employeeId, req.user.company_id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found or not accessible' });
      }

      // Validation des dates d'embauche
      const dateValidation = Payment.validateEmploymentDate(date, employee);
      if (!dateValidation.isValid) {
        return res.status(400).json({ error: dateValidation.error });
      }

      const effectiveType = type || 'salary';

      // Vérifier les doublons pour les salaires
      if (effectiveType === 'salary') {
        const salaryExists = await Payment.salaryExistsForMonth(employeeId, req.user.company_id, date);
        if (salaryExists) {
          const paymentDateObj = new Date(date);
          const monthStr = paymentDateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
          return res.status(409).json({ 
            error: `Un paiement de salaire existe déjà pour ${employee.name || 'cet employé'} pour le mois de ${monthStr}` 
          });
        }
      }

      // Créer le paiement
      const created = await Payment.create({
        employee_id: employeeId,
        amount_cfa: amountCFA,
        amount_usd: amountUSD,
        date,
        status,
        type: effectiveType
      });

      res.status(201).json(created);
    } catch (err) {
      if (err.message === 'Could not generate unique payment reference') {
        return res.status(409).json({ error: 'Could not generate unique payment reference, please retry' });
      }
      next(err);
    }
  }

  /**
   * Mettre à jour un paiement
   */
  static async update(req, res, next) {
    try {
      const { amountCFA, amountUSD, date, status, type } = req.body;

      // Récupérer le paiement existant
      const existing = await Payment.findByIdAndCompanyId(req.params.id, req.user.company_id);
      if (!existing) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const candidateType = type || existing.type;
      const candidateDate = date || existing.date;

      // Validation des dates d'embauche si la date change
      if (date && date !== existing.date) {
        const employee = {
          name: existing.name,
          start_date: existing.start_date,
          created_at: existing.created_at
        };
        
        const dateValidation = Payment.validateEmploymentDate(candidateDate, employee);
        if (!dateValidation.isValid) {
          return res.status(400).json({ error: dateValidation.error });
        }
      }

      // Vérifier les doublons pour les salaires
      if (candidateType === 'salary' && candidateDate) {
        const salaryExists = await Payment.salaryExistsForMonth(
          existing.employee_id, 
          req.user.company_id, 
          candidateDate, 
          req.params.id
        );
        
        if (salaryExists) {
          const d = new Date(candidateDate);
          const monthStr = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
          return res.status(409).json({ 
            error: `Un paiement de salaire existe déjà pour ${existing.name || 'cet employé'} pour le mois de ${monthStr}` 
          });
        }
      }

      // Mettre à jour le paiement
      const updated = await Payment.update(req.params.id, req.user.company_id, {
        amount_cfa: amountCFA,
        amount_usd: amountUSD,
        date,
        status,
        type
      });

      if (!updated) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Supprimer un paiement
   */
  static async delete(req, res, next) {
    try {
      const deleted = await Payment.delete(req.params.id, req.user.company_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Créer des paiements en lot
   */
  static async createBatch(req, res, next) {
    try {
      const { employeeIds, amountCFA, amountUSD, date, status, type } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ error: 'employeeIds array is required and must not be empty' });
      }

      // Validation des données de base
      const validation = Payment.validate({
        employee_id: 1, // Dummy ID pour la validation
        amount_cfa: amountCFA,
        amount_usd: amountUSD,
        date
      });
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }

      // Vérifier que tous les employés appartiennent à l'entreprise
      const employees = [];
      for (const employeeId of employeeIds) {
        const employee = await Employee.findByIdAndCompanyId(employeeId, req.user.company_id);
        if (!employee) {
          return res.status(404).json({ error: `Employee with ID ${employeeId} not found or not accessible` });
        }
        employees.push(employee);
      }

      const createdPayments = [];
      const errors = [];
      const effectiveType = type || 'salary';

      for (const employee of employees) {
        try {
          // Validation des dates d'embauche
          const dateValidation = Payment.validateEmploymentDate(date, employee);
          if (!dateValidation.isValid) {
            errors.push({
              employeeId: employee.id,
              employeeName: employee.name,
              error: dateValidation.error
            });
            continue;
          }

          // Vérifier les doublons pour les salaires
          if (effectiveType === 'salary') {
            const salaryExists = await Payment.salaryExistsForMonth(employee.id, req.user.company_id, date);
            if (salaryExists) {
              const paymentDateObj = new Date(date);
              const monthStr = paymentDateObj.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
              errors.push({
                employeeId: employee.id,
                employeeName: employee.name,
                error: `Un paiement de salaire existe déjà pour ${employee.name} pour le mois de ${monthStr}`
              });
              continue;
            }
          }

          // Créer le paiement
          const created = await Payment.create({
            employee_id: employee.id,
            amount_cfa: amountCFA,
            amount_usd: amountUSD,
            date,
            status,
            type: effectiveType
          });

          createdPayments.push({
            ...created,
            employeeName: employee.name
          });

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
  }
}

export default PaymentController;

