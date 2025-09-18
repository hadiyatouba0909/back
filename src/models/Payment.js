import db from '../utils/db.js';
const { query } = db;

class Payment {
  /**
   * Valider les dates d'embauche
   * @param {string} paymentDate - Date du paiement
   * @param {Object} employee - Données de l'employé
   * @returns {Object} Résultat de validation
   */
  static validateEmploymentDate(paymentDate, employee) {
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

  /**
   * Déterminer le statut automatique du paiement
   * @param {string} paymentDate - Date du paiement
   * @param {string} requestedStatus - Statut demandé
   * @returns {string} Statut final
   */
  static determinePaymentStatus(paymentDate, requestedStatus) {
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

  /**
   * Générer une référence unique pour un paiement
   * @param {number} year - Année du paiement
   * @returns {Promise<string>} Référence générée
   */
  static async generateReference(year) {
    let attempts = 0;
    
    while (attempts < 3) {
      const [{ maxRef }] = await query(
        "SELECT COALESCE(MAX(CAST(split_part(reference, '-', 3) AS INTEGER)), 0) AS \"maxRef\" FROM payments WHERE reference LIKE :prefix",
        { prefix: `PAY-${year}-%` }
      );

      const next = Number(maxRef) + 1;
      const refNumber = String(next).padStart(3, '0');
      const reference = `PAY-${year}-${refNumber}`;
      
      // Vérifier si la référence existe déjà
      const existing = await query(
        'SELECT id FROM payments WHERE reference = :reference',
        { reference }
      );
      
      if (existing.length === 0) {
        return reference;
      }
      
      attempts++;
    }
    
    throw new Error('Could not generate unique payment reference');
  }

  /**
   * Récupérer tous les paiements avec filtres
   * @param {number} companyId - ID de l'entreprise
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} Liste des paiements
   */
  static async findAll(companyId, filters = {}) {
    const { search, employeeId, months } = filters;
    
    let whereClause = 'WHERE e.company_id = :company_id';
    const params = { company_id: companyId };

    if (employeeId) {
      whereClause += ' AND p.employee_id = :employee_id';
      params.employee_id = employeeId;
    }

    if (months && months.length > 0) {
      if (months.length === 1) {
        whereClause += " AND to_char(p.date, 'YYYY-MM') = :m0";
        params.m0 = months[0];
      } else {
        const names = months.map((_, i) => `:m${i}`).join(', ');
        whereClause += ` AND to_char(p.date, 'YYYY-MM') IN (${names})`;
        months.forEach((m, i) => (params[`m${i}`] = m));
      }
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

    return await query(sql, params);
  }

  /**
   * Vérifier si un paiement de salaire existe déjà pour un mois donné
   * @param {number} employeeId - ID de l'employé
   * @param {number} companyId - ID de l'entreprise
   * @param {string} date - Date du paiement
   * @param {number} excludeId - ID à exclure (pour les mises à jour)
   * @returns {Promise<boolean>} True si un paiement existe
   */
  static async salaryExistsForMonth(employeeId, companyId, date, excludeId = null) {
    const paymentDateObj = new Date(date);
    const yyyy = paymentDateObj.getFullYear();
    const mm = String(paymentDateObj.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yyyy}-${mm}`;

    let queryStr = `
      SELECT p.id FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE p.employee_id = :employee_id AND e.company_id = :company_id
      AND COALESCE(p.type,'salary') = 'salary'
      AND to_char(p.date, 'YYYY-MM') = :month
    `;
    
    const params = { employee_id: employeeId, company_id: companyId, month: monthKey };
    
    if (excludeId) {
      queryStr += ' AND p.id <> :exclude_id';
      params.exclude_id = excludeId;
    }
    
    queryStr += ' LIMIT 1';

    const result = await query(queryStr, params);
    return result.length > 0;
  }

  /**
   * Créer un nouveau paiement
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} Paiement créé
   */
  static async create(paymentData) {
    const {
      employee_id,
      amount_cfa,
      amount_usd,
      date,
      status,
      type = 'salary'
    } = paymentData;

    const year = new Date(date).getFullYear();
    const reference = await this.generateReference(year);
    const finalStatus = this.determinePaymentStatus(date, status);

    const result = await query(
      `INSERT INTO payments (employee_id, amount_cfa, amount_usd, date, status, reference, type)
       VALUES (:employee_id, :amount_cfa, :amount_usd, :date, :status, :reference, :type)
       RETURNING id`,
      {
        employee_id,
        amount_cfa,
        amount_usd,
        date,
        status: finalStatus,
        reference,
        type
      }
    );

    return {
      id: result.insertId,
      employee_id,
      amount_cfa,
      amount_usd,
      date,
      status: finalStatus,
      reference,
      type
    };
  }

  /**
   * Trouver un paiement par ID et vérifier l'accès
   * @param {number} id - ID du paiement
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<Object|null>} Paiement ou null
   */
  static async findByIdAndCompanyId(id, companyId) {
    const rows = await query(
      `SELECT p.*, e.company_id, e.name, e.start_date, e.created_at
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.id = :id AND e.company_id = :company_id`,
      { id, company_id: companyId }
    );
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Mettre à jour un paiement
   * @param {number} id - ID du paiement
   * @param {number} companyId - ID de l'entreprise
   * @param {Object} paymentData - Nouvelles données
   * @returns {Promise<Object|null>} Paiement mis à jour ou null
   */
  static async update(id, companyId, paymentData) {
    const { amount_cfa, amount_usd, date, status, type } = paymentData;
    
    // Déterminer le statut final si la date change
    const finalStatus = date ? this.determinePaymentStatus(date, status) : status;

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
        id,
        company_id: companyId,
        amount_cfa: amount_cfa || null,
        amount_usd: amount_usd || null,
        date: date || null,
        status: finalStatus,
        type: type || null
      }
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const updated = await query('SELECT * FROM payments WHERE id = :id', { id });
    return updated[0];
  }

  /**
   * Supprimer un paiement
   * @param {number} id - ID du paiement
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<boolean>} True si supprimé
   */
  static async delete(id, companyId) {
    const result = await query(
      `DELETE FROM payments p
       USING employees e
       WHERE e.id = p.employee_id AND p.id = :id AND e.company_id = :company_id`,
      { id, company_id: companyId }
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Valider les données d'un paiement
   * @param {Object} paymentData - Données à valider
   * @returns {Object} Résultat de validation
   */
  static validate(paymentData) {
    const errors = [];
    const { employee_id, amount_cfa, amount_usd, date } = paymentData;

    if (!employee_id) {
      errors.push('L\'ID de l\'employé est requis');
    }

    if (!amount_cfa || amount_cfa <= 0) {
      errors.push('Le montant en CFA doit être supérieur à 0');
    }

    if (!amount_usd || amount_usd <= 0) {
      errors.push('Le montant en USD doit être supérieur à 0');
    }

    if (!date) {
      errors.push('La date est requise');
    } else if (isNaN(new Date(date).getTime())) {
      errors.push('La date n\'est pas valide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider le format des mois
   * @param {Array} months - Liste des mois au format YYYY-MM
   * @returns {boolean} True si tous les mois sont valides
   */
  static validateMonthsFormat(months) {
    if (!Array.isArray(months)) return false;
    
    return months.every(month => /^\d{4}-\d{2}$/.test(month));
  }
}

export default Payment;

