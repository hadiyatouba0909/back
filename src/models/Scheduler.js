import db from '../utils/db.js';
const { query } = db;

class Scheduler {
  /**
   * Récupérer tous les paiements en attente qui doivent être traités
   * @param {string} date - Date limite (format YYYY-MM-DD)
   * @returns {Promise<Array>} Liste des paiements en attente
   */
  static async getPendingPayments(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    return await query(
      `SELECT p.*, e.name as employee_name, e.company_id
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.status = 'pending' AND p.date <= :today
       ORDER BY p.date ASC, p.created_at ASC`,
      { today }
    );
  }

  /**
   * Mettre à jour le statut d'un paiement de 'pending' à 'paid'
   * @param {number} paymentId - ID du paiement
   * @returns {Promise<boolean>} True si mis à jour avec succès
   */
  static async updatePaymentStatus(paymentId) {
    const result = await query(
      `UPDATE payments
       SET status = 'paid'
       WHERE id = :id AND status = 'pending'`,
      { id: paymentId }
    );

    return result.affectedRows > 0;
  }

  /**
   * Traiter tous les paiements en attente
   * @param {string} date - Date limite optionnelle
   * @returns {Promise<Object>} Résultat du traitement
   */
  static async processPendingPayments(date = null) {
    const pendingPayments = await this.getPendingPayments(date);
    
    if (pendingPayments.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        message: 'No pending payments to process'
      };
    }

    const results = {
      success: true,
      processed: 0,
      failed: 0,
      details: []
    };

    for (const payment of pendingPayments) {
      try {
        const updated = await this.updatePaymentStatus(payment.id);
        
        if (updated) {
          results.processed++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.reference,
            employeeName: payment.employee_name,
            status: 'success',
            message: `Payment updated from 'pending' to 'paid'`
          });
        } else {
          results.failed++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.reference,
            employeeName: payment.employee_name,
            status: 'failed',
            message: 'Payment was not updated (may have been already processed)'
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          paymentId: payment.id,
          reference: payment.reference,
          employeeName: payment.employee_name,
          status: 'error',
          message: error.message
        });
      }
    }

    results.success = results.failed === 0;
    
    return results;
  }

  /**
   * Récupérer les statistiques des paiements par statut
   * @param {number} companyId - ID de l'entreprise (optionnel)
   * @returns {Promise<Object>} Statistiques des paiements
   */
  static async getPaymentStatistics(companyId = null) {
    let whereClause = '';
    const params = {};
    
    if (companyId) {
      whereClause = 'WHERE e.company_id = :company_id';
      params.company_id = companyId;
    }

    const stats = await query(
      `SELECT 
         p.status,
         COUNT(*) as count,
         SUM(p.amount_cfa) as total_cfa,
         SUM(p.amount_usd) as total_usd
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       ${whereClause}
       GROUP BY p.status
       ORDER BY p.status`,
      params
    );

    // Récupérer aussi le total général
    const total = await query(
      `SELECT 
         COUNT(*) as total_count,
         SUM(p.amount_cfa) as total_cfa,
         SUM(p.amount_usd) as total_usd
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       ${whereClause}`,
      params
    );

    return {
      byStatus: stats,
      total: total[0] || { total_count: 0, total_cfa: 0, total_usd: 0 }
    };
  }

  /**
   * Récupérer les paiements en retard (pending avec date passée)
   * @param {number} companyId - ID de l'entreprise (optionnel)
   * @returns {Promise<Array>} Liste des paiements en retard
   */
  static async getOverduePayments(companyId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    let whereClause = `WHERE p.status = 'pending' AND p.date < :today`;
    const params = { today };
    
    if (companyId) {
      whereClause += ' AND e.company_id = :company_id';
      params.company_id = companyId;
    }

    return await query(
      `SELECT p.*, e.name as employee_name, e.company_id
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       ${whereClause}
       ORDER BY p.date ASC`,
      params
    );
  }

  /**
   * Récupérer les paiements à venir (pending avec date future)
   * @param {number} companyId - ID de l'entreprise (optionnel)
   * @param {number} days - Nombre de jours à l'avance (par défaut 30)
   * @returns {Promise<Array>} Liste des paiements à venir
   */
  static async getUpcomingPayments(companyId = null, days = 30) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    let whereClause = `WHERE p.status = 'pending' AND p.date > :today AND p.date <= :future_date`;
    const params = { today, future_date: futureDateStr };
    
    if (companyId) {
      whereClause += ' AND e.company_id = :company_id';
      params.company_id = companyId;
    }

    return await query(
      `SELECT p.*, e.name as employee_name, e.company_id
       FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       ${whereClause}
       ORDER BY p.date ASC`,
      params
    );
  }

  /**
   * Valider une date au format YYYY-MM-DD
   * @param {string} date - Date à valider
   * @returns {Object} Résultat de validation
   */
  static validateDate(date) {
    const errors = [];
    
    if (!date) {
      errors.push('La date est requise');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('La date doit être au format YYYY-MM-DD');
    } else {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        errors.push('La date n\'est pas valide');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default Scheduler;

