import Employee from '../models/Employee.js';
import db from '../utils/db.js';
const { query } = db;

class EmployeeController {
  /**
   * Récupérer tous les employés de l'entreprise de l'utilisateur connecté
   */
  static async getAll(req, res, next) {
    try {
      const employees = await Employee.findByCompanyId(req.user.company_id);
      res.json(employees);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer un employé spécifique
   */
  static async getById(req, res, next) {
    try {
      const employee = await Employee.findByIdAndCompanyId(req.params.id, req.user.company_id);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Créer un nouvel employé
   */
  static async create(req, res, next) {
    try {
      const { name, email, phone, position, contract, startDate, salaryCFA, salaryUSD } = req.body;
      
      // Validation des données
      const validation = Employee.validate({ name, position, contract });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }

      let companyId = req.user.company_id;

      // Si l'utilisateur n'a pas de company_id, créer automatiquement une entreprise
      if (!companyId) {
        const companyResult = await query(
          'INSERT INTO companies (name, email) VALUES (:name, :email) RETURNING id',
          {
            name: `Entreprise de ${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email
          }
        );
        companyId = companyResult.insertId;

        // Mettre à jour l'utilisateur avec le company_id
        await query(
          'UPDATE users SET company_id = :company_id WHERE id = :user_id',
          { company_id: companyId, user_id: req.user.id }
        );

        // Mettre à jour l'objet user dans la session
        req.user.company_id = companyId;
      }

      // Préparer les données pour le modèle
      const employeeData = {
        company_id: companyId,
        name,
        email,
        phone,
        position,
        contract,
        salary_cfa: salaryCFA,
        salary_usd: salaryUSD,
        start_date: startDate
      };

      const created = await Employee.create(employeeData);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mettre à jour un employé
   */
  static async update(req, res, next) {
    try {
      if (!req.user.company_id) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const { name, email, phone, position, contract, startDate, salaryCFA, salaryUSD } = req.body;

      // Validation des données
      const validation = Employee.validate({ name, position, contract });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }

      // Préparer les données pour le modèle
      const employeeData = {
        name,
        email,
        phone,
        position,
        contract,
        start_date: startDate,
        salary_cfa: salaryCFA,
        salary_usd: salaryUSD
      };

      const updated = await Employee.update(req.params.id, req.user.company_id, employeeData);
      
      if (!updated) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json(updated);
    } catch (err) {
      console.error('Error updating employee:', err);
      next(err);
    }
  }

  /**
   * Supprimer un employé
   */
  static async delete(req, res, next) {
    try {
      const deleted = await Employee.delete(req.params.id, req.user.company_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export default EmployeeController;

