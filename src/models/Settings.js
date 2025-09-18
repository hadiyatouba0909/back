import db from '../utils/db.js';
const { query } = db;

class Settings {
  /**
   * Récupérer une valeur de paramètre par clé
   * @param {string} key - Clé du paramètre
   * @returns {Promise<string|null>} Valeur du paramètre ou null
   */
  static async getValue(key) {
    const rows = await query("SELECT value FROM settings WHERE \"key\" = :key", { key });
    return rows.length > 0 ? rows[0].value : null;
  }

  /**
   * Définir ou mettre à jour une valeur de paramètre
   * @param {string} key - Clé du paramètre
   * @param {string} value - Valeur du paramètre
   * @returns {Promise<boolean>} True si l'opération a réussi
   */
  static async setValue(key, value) {
    const result = await query(
      `INSERT INTO settings ("key", "value") VALUES (:key, :value)
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
      { key, value: String(value) }
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Récupérer le taux de change USD vers XOF
   * @returns {Promise<string|null>} Taux de change ou null
   */
  static async getExchangeRate() {
    return await this.getValue('usd_to_xof');
  }

  /**
   * Définir le taux de change USD vers XOF
   * @param {number|string} rate - Nouveau taux de change
   * @returns {Promise<boolean>} True si l'opération a réussi
   */
  static async setExchangeRate(rate) {
    return await this.setValue('usd_to_xof', rate);
  }

  /**
   * Récupérer tous les paramètres
   * @returns {Promise<Array>} Liste de tous les paramètres
   */
  static async getAll() {
    return await query("SELECT \"key\", value FROM settings ORDER BY \"key\"");
  }

  /**
   * Supprimer un paramètre
   * @param {string} key - Clé du paramètre à supprimer
   * @returns {Promise<boolean>} True si supprimé
   */
  static async delete(key) {
    const result = await query("DELETE FROM settings WHERE \"key\" = :key", { key });
    return result.affectedRows > 0;
  }

  /**
   * Valider une valeur de taux de change
   * @param {any} value - Valeur à valider
   * @returns {Object} Résultat de validation
   */
  static validateExchangeRate(value) {
    const errors = [];

    if (value === null || value === undefined || value === '') {
      errors.push('La valeur du taux de change est requise');
    } else {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push('La valeur du taux de change doit être un nombre');
      } else if (numValue <= 0) {
        errors.push('La valeur du taux de change doit être supérieure à 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider une clé de paramètre
   * @param {string} key - Clé à valider
   * @returns {Object} Résultat de validation
   */
  static validateKey(key) {
    const errors = [];

    if (!key || key.trim() === '') {
      errors.push('La clé du paramètre est requise');
    } else if (key.length > 255) {
      errors.push('La clé du paramètre ne peut pas dépasser 255 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Settings;

