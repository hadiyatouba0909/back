import Settings from '../models/Settings.js';

class SettingsController {
  /**
   * Récupérer le taux de change USD vers XOF
   */
  static async getExchangeRate(req, res, next) {
    try {
      const value = await Settings.getExchangeRate();
      res.json({ key: 'usd_to_xof', value });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mettre à jour le taux de change USD vers XOF
   */
  static async updateExchangeRate(req, res, next) {
    try {
      const { value } = req.body;
      
      // Validation de la valeur
      const validation = Settings.validateExchangeRate(value);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Valeur invalide', 
          details: validation.errors 
        });
      }

      const success = await Settings.setExchangeRate(value);
      if (!success) {
        return res.status(500).json({ error: 'Failed to update exchange rate' });
      }

      res.json({ 
        success: true, 
        key: 'usd_to_xof', 
        value: String(value) 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer tous les paramètres
   */
  static async getAll(req, res, next) {
    try {
      const settings = await Settings.getAll();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer un paramètre spécifique par clé
   */
  static async getByKey(req, res, next) {
    try {
      const { key } = req.params;
      
      // Validation de la clé
      const validation = Settings.validateKey(key);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Clé invalide', 
          details: validation.errors 
        });
      }

      const value = await Settings.getValue(key);
      res.json({ key, value });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Définir ou mettre à jour un paramètre
   */
  static async setValue(req, res, next) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      // Validation de la clé
      const keyValidation = Settings.validateKey(key);
      if (!keyValidation.isValid) {
        return res.status(400).json({ 
          error: 'Clé invalide', 
          details: keyValidation.errors 
        });
      }

      if (value === null || value === undefined) {
        return res.status(400).json({ error: 'La valeur est requise' });
      }

      const success = await Settings.setValue(key, value);
      if (!success) {
        return res.status(500).json({ error: 'Failed to set setting value' });
      }

      res.json({ 
        success: true, 
        key, 
        value: String(value) 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Supprimer un paramètre
   */
  static async delete(req, res, next) {
    try {
      const { key } = req.params;
      
      // Validation de la clé
      const validation = Settings.validateKey(key);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Clé invalide', 
          details: validation.errors 
        });
      }

      const deleted = await Settings.delete(key);
      if (!deleted) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export default SettingsController;

