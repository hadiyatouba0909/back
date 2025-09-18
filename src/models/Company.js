import db from '../utils/db.js';
const { query } = db;

class Company {
  /**
   * Récupérer l'ID de l'entreprise d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<number|null>} ID de l'entreprise ou null
   */
  static async getCompanyIdByUserId(userId) {
    const users = await query(
      'SELECT company_id FROM users WHERE id = :userId',
      { userId }
    );
    
    return users.length > 0 && users[0].company_id ? users[0].company_id : null;
  }

  /**
   * Récupérer une entreprise par son ID
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<Object|null>} Entreprise ou null si non trouvée
   */
  static async findById(companyId) {
    const companies = await query(
      'SELECT id, name, address, email, phone, created_at, updated_at FROM companies WHERE id = :companyId',
      { companyId }
    );
    
    return companies.length > 0 ? companies[0] : null;
  }

  /**
   * Récupérer l'entreprise d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste contenant l'entreprise ou liste vide
   */
  static async findByUserId(userId) {
    const companyId = await this.getCompanyIdByUserId(userId);
    
    if (!companyId) {
      return [];
    }
    
    const companies = await query(
      'SELECT id, name, address, email, phone, created_at, updated_at FROM companies WHERE id = :companyId',
      { companyId }
    );
    
    return companies;
  }

  /**
   * Créer une nouvelle entreprise
   * @param {Object} companyData - Données de l'entreprise
   * @returns {Promise<Object>} Entreprise créée
   */
  static async create(companyData) {
    const { name, address, email, phone } = companyData;
    
    const result = await query(
      'INSERT INTO companies (name, address, email, phone) VALUES (:name, :address, :email, :phone) RETURNING id',
      {
        name,
        address: address || null,
        email: email || null,
        phone: phone || null
      }
    );
    
    return {
      id: result.insertId,
      name,
      address,
      email,
      phone
    };
  }

  /**
   * Mettre à jour une entreprise
   * @param {number} companyId - ID de l'entreprise
   * @param {Object} companyData - Nouvelles données de l'entreprise
   * @returns {Promise<boolean>} True si mise à jour réussie
   */
  static async update(companyId, companyData) {
    const { name, address, email, phone } = companyData;
    
    const result = await query(
      'UPDATE companies SET name = :name, address = :address, email = :email, phone = :phone WHERE id = :companyId',
      {
        name,
        address: address || null,
        email: email || null,
        phone: phone || null,
        companyId
      }
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Associer un utilisateur à une entreprise
   * @param {number} userId - ID de l'utilisateur
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<boolean>} True si association réussie
   */
  static async associateUser(userId, companyId) {
    const result = await query(
      'UPDATE users SET company_id = :companyId WHERE id = :userId',
      { companyId, userId }
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Vérifier si un utilisateur appartient à une entreprise
   * @param {number} userId - ID de l'utilisateur
   * @param {number} companyId - ID de l'entreprise
   * @returns {Promise<boolean>} True si l'utilisateur appartient à l'entreprise
   */
  static async userBelongsToCompany(userId, companyId) {
    const userCompanyId = await this.getCompanyIdByUserId(userId);
    return userCompanyId == companyId;
  }

  /**
   * Valider les données d'une entreprise
   * @param {Object} companyData - Données à valider
   * @returns {Object} Objet avec isValid et errors
   */
  static validate(companyData) {
    const errors = [];
    const { name } = companyData;

    if (!name || name.trim() === '') {
      errors.push('Le nom de l\'entreprise est requis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Company;

