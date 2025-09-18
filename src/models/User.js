import bcryptPkg from 'bcryptjs';
const { hash, compare } = bcryptPkg;
import db from '../utils/db.js';
const { query } = db;

class User {
  /**
   * Créer un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise<Object>} Utilisateur créé
   */
  static async create(userData) {
    const { firstName, lastName, email, phone, password, companyId } = userData;
    
    const passwordHash = await hash(password, 10);
    const result = await query(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone || null, passwordHash, companyId || null]
    );

    return {
      id: result.insertId,
      firstName,
      lastName,
      email,
      phone,
      companyId
    };
  }

  /**
   * Trouver un utilisateur par email
   * @param {string} email - Email de l'utilisateur
   * @returns {Promise<Object|null>} Utilisateur ou null si non trouvé
   */
  static async findByEmail(email) {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Trouver un utilisateur par ID
   * @param {number} id - ID de l'utilisateur
   * @returns {Promise<Object|null>} Utilisateur ou null si non trouvé
   */
  static async findById(id) {
    const users = await query(
      'SELECT id, first_name, last_name, email, phone, company_id FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) return null;
    
    const user = users[0];
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      companyId: user.company_id
    };
  }

  /**
   * Vérifier si un email existe déjà
   * @param {string} email - Email à vérifier
   * @param {number} excludeId - ID à exclure de la vérification (pour les mises à jour)
   * @returns {Promise<boolean>} True si l'email existe
   */
  static async emailExists(email, excludeId = null) {
    let queryStr = 'SELECT id FROM users WHERE email = ?';
    let params = [email];
    
    if (excludeId) {
      queryStr += ' AND id != ?';
      params.push(excludeId);
    }
    
    const existing = await query(queryStr, params);
    return existing.length > 0;
  }

  /**
   * Vérifier le mot de passe d'un utilisateur
   * @param {string} password - Mot de passe en clair
   * @param {string} hashedPassword - Mot de passe hashé
   * @returns {Promise<boolean>} True si le mot de passe est correct
   */
  static async verifyPassword(password, hashedPassword) {
    return await compare(password, hashedPassword);
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   * @param {number} id - ID de l'utilisateur
   * @param {Object} userData - Nouvelles données
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  static async updateProfile(id, userData) {
    const { firstName, lastName, email, phone } = userData;
    
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
      [firstName, lastName, email, phone || null, id]
    );
    
    return { id, firstName, lastName, email, phone };
  }

  /**
   * Changer le mot de passe d'un utilisateur
   * @param {number} id - ID de l'utilisateur
   * @param {string} newPassword - Nouveau mot de passe
   * @returns {Promise<boolean>} True si mis à jour avec succès
   */
  static async updatePassword(id, newPassword) {
    const newPasswordHash = await hash(newPassword, 10);
    
    const result = await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Récupérer le mot de passe hashé d'un utilisateur
   * @param {number} id - ID de l'utilisateur
   * @returns {Promise<string|null>} Mot de passe hashé ou null
   */
  static async getPasswordHash(id) {
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [id]
    );
    
    return users.length > 0 ? users[0].password_hash : null;
  }

  /**
   * Valider les données d'un utilisateur
   * @param {Object} userData - Données à valider
   * @param {boolean} isUpdate - True si c'est une mise à jour
   * @returns {Object} Objet avec isValid et errors
   */
  static validate(userData, isUpdate = false) {
    const errors = [];
    const { firstName, lastName, email, password } = userData;

    if (!firstName || firstName.trim() === '') {
      errors.push('Le prénom est requis');
    }

    if (!lastName || lastName.trim() === '') {
      errors.push('Le nom est requis');
    }

    if (!email || email.trim() === '') {
      errors.push('L\'email est requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('L\'email n\'est pas valide');
    }

    if (!isUpdate && (!password || password.length < 6)) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider les données de changement de mot de passe
   * @param {Object} passwordData - Données du mot de passe
   * @returns {Object} Objet avec isValid et errors
   */
  static validatePasswordChange(passwordData) {
    const errors = [];
    const { currentPassword, newPassword } = passwordData;

    if (!currentPassword) {
      errors.push('Le mot de passe actuel est requis');
    }

    if (!newPassword || newPassword.length < 6) {
      errors.push('Le nouveau mot de passe doit contenir au moins 6 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default User;

