import Scheduler from '../models/Scheduler.js';
import paymentScheduler from '../services/paymentScheduler.js';

class SchedulerController {
  /**
   * Obtenir le statut du scheduler
   */
  static async getStatus(req, res, next) {
    try {
      const status = paymentScheduler.getStatus();
      res.json({
        scheduler: status,
        message: status.isRunning ? 'Payment scheduler is running' : 'Payment scheduler is stopped'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get scheduler status' });
    }
  }

  /**
   * Déclencher manuellement la vérification des paiements
   */
  static async checkPayments(req, res, next) {
    try {
      const { date } = req.body; // Date optionnelle au format YYYY-MM-DD
      
      // Validation de la date si fournie
      if (date) {
        const dateValidation = Scheduler.validateDate(date);
        if (!dateValidation.isValid) {
          return res.status(400).json({ 
            error: 'Date invalide', 
            details: dateValidation.errors 
          });
        }
      }

      const result = await Scheduler.processPendingPayments(date);
      
      res.json({ 
        success: result.success, 
        message: 'Manual payment check completed',
        result
      });
    } catch (error) {
      console.error('Manual payment check failed:', error);
      res.status(500).json({ 
        error: 'Failed to run manual payment check',
        details: error.message 
      });
    }
  }

  /**
   * Redémarrer le scheduler
   */
  static async restart(req, res, next) {
    try {
      paymentScheduler.stop();
      paymentScheduler.start();
      res.json({ 
        success: true, 
        message: 'Payment scheduler restarted successfully' 
      });
    } catch (error) {
      console.error('Failed to restart scheduler:', error);
      res.status(500).json({ 
        error: 'Failed to restart scheduler',
        details: error.message 
      });
    }
  }

  /**
   * Démarrer le scheduler
   */
  static async start(req, res, next) {
    try {
      paymentScheduler.start();
      res.json({ 
        success: true, 
        message: 'Payment scheduler started successfully' 
      });
    } catch (error) {
      console.error('Failed to start scheduler:', error);
      res.status(500).json({ 
        error: 'Failed to start scheduler',
        details: error.message 
      });
    }
  }

  /**
   * Arrêter le scheduler
   */
  static async stop(req, res, next) {
    try {
      paymentScheduler.stop();
      res.json({ 
        success: true, 
        message: 'Payment scheduler stopped successfully' 
      });
    } catch (error) {
      console.error('Failed to stop scheduler:', error);
      res.status(500).json({ 
        error: 'Failed to stop scheduler',
        details: error.message 
      });
    }
  }

  /**
   * Récupérer les statistiques des paiements
   */
  static async getStatistics(req, res, next) {
    try {
      const companyId = req.user.company_id; // Filtrer par entreprise de l'utilisateur
      const stats = await Scheduler.getPaymentStatistics(companyId);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get payment statistics:', error);
      res.status(500).json({ 
        error: 'Failed to get payment statistics',
        details: error.message 
      });
    }
  }

  /**
   * Récupérer les paiements en retard
   */
  static async getOverduePayments(req, res, next) {
    try {
      const companyId = req.user.company_id; // Filtrer par entreprise de l'utilisateur
      const overduePayments = await Scheduler.getOverduePayments(companyId);
      res.json(overduePayments);
    } catch (error) {
      console.error('Failed to get overdue payments:', error);
      res.status(500).json({ 
        error: 'Failed to get overdue payments',
        details: error.message 
      });
    }
  }

  /**
   * Récupérer les paiements à venir
   */
  static async getUpcomingPayments(req, res, next) {
    try {
      const companyId = req.user.company_id; // Filtrer par entreprise de l'utilisateur
      const days = parseInt(req.query.days) || 30; // Nombre de jours à l'avance
      
      if (days < 1 || days > 365) {
        return res.status(400).json({ 
          error: 'Le nombre de jours doit être entre 1 et 365' 
        });
      }

      const upcomingPayments = await Scheduler.getUpcomingPayments(companyId, days);
      res.json(upcomingPayments);
    } catch (error) {
      console.error('Failed to get upcoming payments:', error);
      res.status(500).json({ 
        error: 'Failed to get upcoming payments',
        details: error.message 
      });
    }
  }

  /**
   * Récupérer les paiements en attente
   */
  static async getPendingPayments(req, res, next) {
    try {
      const { date } = req.query; // Date optionnelle
      
      // Validation de la date si fournie
      if (date) {
        const dateValidation = Scheduler.validateDate(date);
        if (!dateValidation.isValid) {
          return res.status(400).json({ 
            error: 'Date invalide', 
            details: dateValidation.errors 
          });
        }
      }

      const pendingPayments = await Scheduler.getPendingPayments(date);
      res.json(pendingPayments);
    } catch (error) {
      console.error('Failed to get pending payments:', error);
      res.status(500).json({ 
        error: 'Failed to get pending payments',
        details: error.message 
      });
    }
  }
}

export default SchedulerController;

