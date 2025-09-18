import { createServer } from 'http';
import app from './app.js';
import db from './utils/db.js';
import paymentScheduler from './services/paymentScheduler.js';

const PORT = process.env.PORT || 5000;

// La configuration dotenv est gérée dans app.js
(async () => {
    try {
        await db.testConnection();
        
        // Démarrer le scheduler de paiements
        paymentScheduler.start();
        
        const server = createServer(app);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`API running on http://0.0.0.0:${PORT}`);
            console.log('Payment scheduler is active');
        });

        // Gérer l'arrêt propre de l'application
        process.on('SIGINT', () => {
            console.log('Shutting down gracefully...');
            paymentScheduler.stop();
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            console.log('Shutting down gracefully...');
            paymentScheduler.stop();
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();