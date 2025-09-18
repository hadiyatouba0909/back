import axios from 'axios';

class Currency {
  // Cache pour les taux de change
  static cache = {
    rates: {},
    lastFetched: 0,
    ttlMs: 10 * 60 * 1000 // 10 minutes
  };

  /**
   * Récupérer les taux de change depuis l'API externe
   * @param {string} base - Devise de base (par défaut USD)
   * @returns {Promise<Object>} Taux de change
   */
  static async fetchRates(base = 'USD') {
    const now = Date.now();
    
    // Vérifier le cache
    if (this.cache.rates[base] && (now - this.cache.lastFetched) < this.cache.ttlMs) {
      return this.cache.rates[base];
    }
    
    const url = process.env.CURRENCY_API_URL || 'https://api.freecurrencyapi.com/v1/latest';
    const apiKey = process.env.CURRENCY_API_KEY;
    
    if (!apiKey) {
      throw new Error('CURRENCY_API_KEY missing');
    }
    
    try {
      const response = await axios.get(url, {
        params: { base_currency: base },
        headers: { apikey: apiKey },
        timeout: 10000 // 10 secondes de timeout
      });
      
      const data = response.data?.data || {};
      
      // Mettre à jour le cache
      this.cache.rates[base] = data;
      this.cache.lastFetched = now;
      
      return data;
    } catch (error) {
      // En cas d'erreur, retourner les données du cache si disponibles
      if (this.cache.rates[base]) {
        return this.cache.rates[base];
      }
      throw error;
    }
  }

  /**
   * Récupérer les taux de change avec filtrage optionnel
   * @param {string} base - Devise de base
   * @param {string} symbols - Devises cibles séparées par des virgules
   * @returns {Promise<Object>} Taux de change filtrés
   */
  static async getRates(base = 'USD', symbols = '') {
    const allRates = await this.fetchRates(base);
    
    if (!symbols) {
      return { base, rates: allRates };
    }
    
    const subset = {};
    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    
    symbolList.forEach(symbol => {
      if (allRates[symbol] != null) {
        subset[symbol] = allRates[symbol];
      }
    });
    
    return { base, rates: subset };
  }

  /**
   * Convertir un montant d'une devise à une autre
   * @param {string} from - Devise source
   * @param {string} to - Devise cible
   * @param {number} amount - Montant à convertir
   * @returns {Promise<Object>} Résultat de la conversion
   */
  static async convert(from, to, amount) {
    const rates = await this.fetchRates(from);
    const rate = rates[to];
    
    if (!rate) {
      throw new Error(`Rate ${from}->${to} not available`);
    }
    
    const converted = amount * rate;
    
    return {
      from,
      to,
      amount,
      rate,
      converted: Math.round(converted * 100) / 100 // Arrondir à 2 décimales
    };
  }

  /**
   * Vider le cache des taux de change
   */
  static clearCache() {
    this.cache.rates = {};
    this.cache.lastFetched = 0;
  }

  /**
   * Obtenir les informations du cache
   * @returns {Object} Informations sur le cache
   */
  static getCacheInfo() {
    const now = Date.now();
    const isExpired = (now - this.cache.lastFetched) >= this.cache.ttlMs;
    
    return {
      lastFetched: new Date(this.cache.lastFetched).toISOString(),
      isExpired,
      ttlMs: this.cache.ttlMs,
      cachedBases: Object.keys(this.cache.rates)
    };
  }

  /**
   * Valider une devise
   * @param {string} currency - Code de devise à valider
   * @returns {Object} Résultat de validation
   */
  static validateCurrency(currency) {
    const errors = [];
    
    if (!currency || typeof currency !== 'string') {
      errors.push('Le code de devise est requis');
    } else if (currency.length !== 3) {
      errors.push('Le code de devise doit contenir exactement 3 caractères');
    } else if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push('Le code de devise doit contenir uniquement des lettres majuscules');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valider un montant pour conversion
   * @param {any} amount - Montant à valider
   * @returns {Object} Résultat de validation
   */
  static validateAmount(amount) {
    const errors = [];
    const numAmount = Number(amount);
    
    if (isNaN(numAmount)) {
      errors.push('Le montant doit être un nombre valide');
    } else if (numAmount < 0) {
      errors.push('Le montant doit être positif');
    } else if (numAmount === 0) {
      errors.push('Le montant doit être supérieur à 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: numAmount
    };
  }

  /**
   * Valider les paramètres de conversion
   * @param {string} from - Devise source
   * @param {string} to - Devise cible
   * @param {any} amount - Montant
   * @returns {Object} Résultat de validation
   */
  static validateConversion(from, to, amount) {
    const errors = [];
    
    const fromValidation = this.validateCurrency(from);
    if (!fromValidation.isValid) {
      errors.push(...fromValidation.errors.map(e => `Devise source: ${e}`));
    }
    
    const toValidation = this.validateCurrency(to);
    if (!toValidation.isValid) {
      errors.push(...toValidation.errors.map(e => `Devise cible: ${e}`));
    }
    
    const amountValidation = this.validateAmount(amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      values: {
        from: from?.toUpperCase(),
        to: to?.toUpperCase(),
        amount: amountValidation.value
      }
    };
  }
}

export default Currency;

