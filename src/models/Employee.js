import db from '../utils/db.js';
const { query } = db;

class Employee {
  /**
   * Récupérer tous les employés d'une entreprise
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<Array>} Liste des employés
   */
  static async findByCompanyId(companyId) {
    if (!companyId) {
      return [];
    }
    
    return await query(
      'SELECT e.* FROM employees e WHERE e.company_id = :company_id ORDER BY e.created_at DESC',
      { company_id: companyId }
    );
  }

  /**
   * Récupérer un employé par son ID et l'ID de l'entreprise
   * @param {number} id - ID de l'employé
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<Object|null>} Employé ou null si non trouvé
   */
  static async findByIdAndCompanyId(id, companyId) {
    if (!companyId) {
      return null;
    }

    const rows = await query(
      'SELECT * FROM employees WHERE id = :id AND company_id = :company_id',
      { id, company_id: companyId }
    );
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Créer un nouvel employé
   * @param {Object} employeeData - Données de l'employé
   * @returns {Promise<Object>} Employé créé
   */
  static async create(employeeData) {
    const {
      company_id,
      name,
      email,
      phone,
      position,
      contract,
      salary_cfa,
      salary_usd,
      start_date
    } = employeeData;

    const result = await query(
      `INSERT INTO employees (company_id, name, email, phone, position, contract, salary_cfa, salary_usd, start_date)
       VALUES (:company_id, :name, :email, :phone, :position, :contract, :salary_cfa, :salary_usd, :start_date)`,
      {
        company_id,
        name,
        email: email || null,
        phone: phone || null,
        position,
        contract,
        salary_cfa: salary_cfa || null,
        salary_usd: salary_usd || null,
        start_date: start_date || null
      }
    );

    const created = await query('SELECT * FROM employees WHERE id = :id', { id: result.insertId });
    return created[0];
  }

  /**
   * Mettre à jour un employé
   * @param {number} id - ID de l'employé
   * @param {number} companyId - ID de l'entreprise
   * @param {Object} employeeData - Nouvelles données de l'employé
   * @returns {Promise<Object|null>} Employé mis à jour ou null si non trouvé
   */
  static async update(id, companyId, employeeData) {
    const {
      name,
      email,
      phone,
      position,
      contract,
      start_date,
      salary_cfa,
      salary_usd
    } = employeeData;

    const result = await query(
      `UPDATE employees SET 
         name = :name, 
         email = :email, 
         phone = :phone,
         position = :position, 
         contract = :contract, 
         start_date = :start_date,
         salary_cfa = :salary_cfa, 
         salary_usd = :salary_usd
       WHERE id = :id AND company_id = :company_id`,
      {
        id,
        company_id: companyId,
        name,
        email: email || null,
        phone: phone || null,
        position,
        contract,
        start_date: start_date || null,
        salary_cfa: salary_cfa !== null && salary_cfa !== undefined ? Number(salary_cfa) : null,
        salary_usd: salary_usd !== null && salary_usd !== undefined ? Number(salary_usd) : null
      }
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const updated = await query('SELECT * FROM employees WHERE id = :id', { id });
    return updated[0];
  }

  /**
   * Supprimer un employé
   * @param {number} id - ID de l'employé
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<boolean>} True si supprimé, false sinon
   */
  static async delete(id, companyId) {
    if (!companyId) {
      return false;
    }

    const result = await query(
      'DELETE FROM employees WHERE id = :id AND company_id = :company_id',
      { id, company_id: companyId }
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Valider les données d'un employé
   * @param {Object} employeeData - Données à valider
   * @returns {Object} Objet avec isValid et errors
   */
  static validate(employeeData) {
    const errors = [];
    const { name, position, contract } = employeeData;

    if (!name || name.trim() === '') {
      errors.push('Le nom est requis');
    }

    if (!position || position.trim() === '') {
      errors.push('Le poste est requis');
    }

    if (!contract || contract.trim() === '') {
      errors.push('Le type de contrat est requis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Employee;

