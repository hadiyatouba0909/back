import db from '../utils/db.js';
const { query } = db;

class PaymentScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Démarre le scheduler qui vérifie les paiements en attente toutes les heures
   */
  start() {
    if (this.isRunning) {
      console.log('Payment scheduler is already running');
      return;
    }

    console.log('Starting payment scheduler...');
    this.isRunning = true;

    // Exécuter immédiatement une fois au démarrage
    this.checkPendingPayments();

    // Puis exécuter toutes les heures (3600000 ms = 1 heure)
    this.intervalId = setInterval(() => {
      this.checkPendingPayments();
    }, 3600000); // 1 heure

    console.log('Payment scheduler started - checking every hour');
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Payment scheduler stopped');
  }

  /**
   * Vérifie les paiements en attente et met à jour leur statut si nécessaire
   */
  async checkPendingPayments() {
    try {
      console.log('Checking pending payments...');
      
      // Obtenir la date actuelle au format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];

      // Trouver tous les paiements avec le statut 'pending' dont la date est aujourd'hui ou dans le passé
      const pendingPayments = await query(
        `SELECT p.*, e.name as employee_name
         FROM payments p
         LEFT JOIN employees e ON e.id = p.employee_id
         WHERE p.status = 'pending' AND p.date <= :today`,
        { today }
      );

      if (pendingPayments.length === 0) {
        console.log('No pending payments to process');
        return;
      }

      console.log(`Found ${pendingPayments.length} pending payment(s) to process`);

      // Mettre à jour le statut de chaque paiement en attente
      for (const payment of pendingPayments) {
        await this.updatePaymentStatus(payment);
      }

      console.log('Finished processing pending payments');
    } catch (error) {
      console.error('Error checking pending payments:', error);
    }
  }

  /**
   * Met à jour le statut d'un paiement de 'pending' à 'paid'
   */
  async updatePaymentStatus(payment) {
    try {
      // Removed updated_at since it might not exist in your table
      const result = await query(
        `UPDATE payments
         SET status = 'paid'
         WHERE id = :id AND status = 'pending'`,
        { id: payment.id }
      );

      if (result.affectedRows > 0) {
        console.log(`Payment ${payment.reference} for employee ${payment.employee_name} updated from 'pending' to 'paid'`);
      }
    } catch (error) {
      console.error(`Error updating payment ${payment.reference}:`, error);
    }
  }

  /**
   * Méthode pour exécuter manuellement la vérification (utile pour les tests)
   */
  async runManualCheck() {
    console.log('Running manual payment check...');
    await this.checkPendingPayments();
  }

  /**
   * Obtient le statut du scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    };
  }
}

// Créer une instance singleton
const paymentScheduler = new PaymentScheduler();

export default paymentScheduler;