import Currency from '../models/Currency.js';

class CurrencyController {
  /**
   * Récupérer les taux de change
   */
  static async getRates(req, res, next) {
    try {
      const base = (req.query.base || 'USD').toString().toUpperCase();
      const symbols = (req.query.symbols || '').toString().toUpperCase();
      
      // Validation de la devise de base
      const baseValidation = Currency.validateCurrency(base);
      if (!baseValidation.isValid) {
        return res.status(400).json({ 
          error: 'Devise de base invalide', 
          details: baseValidation.errors 
        });
      }
      
      // Validation des devises cibles si spécifiées
      if (symbols) {
        const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
        for (const symbol of symbolList) {
          const symbolValidation = Currency.validateCurrency(symbol);
          if (!symbolValidation.isValid) {
            return res.status(400).json({ 
              error: `Devise cible invalide: ${symbol}`, 
              details: symbolValidation.errors 
            });
          }
        }
      }
      
      const result = await Currency.getRates(base, symbols);
      res.json(result);
    } catch (err) {
      if (err.message === 'CURRENCY_API_KEY missing') {
        return res.status(500).json({ 
          error: 'Configuration manquante pour l\'API de devises' 
        });
      }
      next(err);
    }
  }

  /**
   * Convertir un montant entre deux devises
   */
  static async convert(req, res, next) {
    try {
      const from = (req.query.from || 'USD').toString().toUpperCase();
      const to = (req.query.to || 'XOF').toString().toUpperCase();
      const amount = req.query.amount || '1';
      
      // Validation des paramètres
      const validation = Currency.validateConversion(from, to, amount);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Paramètres de conversion invalides', 
          details: validation.errors 
        });
      }
      
      const result = await Currency.convert(
        validation.values.from, 
        validation.values.to, 
        validation.values.amount
      );
      
      res.json(result);
    } catch (err) {
      if (err.message.includes('Rate') && err.message.includes('not available')) {
        return res.status(400).json({ error: err.message });
      }
      if (err.message === 'CURRENCY_API_KEY missing') {
        return res.status(500).json({ 
          error: 'Configuration manquante pour l\'API de devises' 
        });
      }
      next(err);
    }
  }

  /**
   * Obtenir les informations sur le cache
   */
  static async getCacheInfo(req, res, next) {
    try {
      const cacheInfo = Currency.getCacheInfo();
      res.json(cacheInfo);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Vider le cache des taux de change
   */
  static async clearCache(req, res, next) {
    try {
      Currency.clearCache();
      res.json({ 
        success: true, 
        message: 'Cache vidé avec succès' 
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer les devises supportées (liste statique des principales devises)
   */
  static async getSupportedCurrencies(req, res, next) {
    try {
      const supportedCurrencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
        { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
        { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
        { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
        { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
        { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
        { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
        { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
        { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
      ];
      
      res.json(supportedCurrencies);
    } catch (err) {
      next(err);
    }
  }
}

export default CurrencyController;

