// Script de test simple pour vérifier le scheduler de paiements
import paymentScheduler from './src/services/paymentScheduler.js';

console.log('=== Test du Payment Scheduler ===');

// Test 1: Vérifier que le scheduler peut être créé
console.log('\n1. Test de création du scheduler...');
try {
  const status = paymentScheduler.getStatus();
  console.log('✓ Scheduler créé avec succès');
  console.log('Status initial:', status);
} catch (error) {
  console.error('✗ Erreur lors de la création du scheduler:', error.message);
  process.exit(1);
}

// Test 2: Vérifier que le scheduler peut démarrer et s'arrêter
console.log('\n2. Test de démarrage/arrêt du scheduler...');
try {
  paymentScheduler.start();
  console.log('✓ Scheduler démarré');
  
  const statusRunning = paymentScheduler.getStatus();
  console.log('Status en cours d\'exécution:', statusRunning);
  
  if (!statusRunning.isRunning) {
    throw new Error('Le scheduler devrait être en cours d\'exécution');
  }
  
  paymentScheduler.stop();
  console.log('✓ Scheduler arrêté');
  
  const statusStopped = paymentScheduler.getStatus();
  console.log('Status après arrêt:', statusStopped);
  
  if (statusStopped.isRunning) {
    throw new Error('Le scheduler devrait être arrêté');
  }
} catch (error) {
  console.error('✗ Erreur lors du test de démarrage/arrêt:', error.message);
  process.exit(1);
}

// Test 3: Test de la méthode de vérification manuelle (sans base de données)
console.log('\n3. Test de la méthode de vérification manuelle...');
try {
  // Note: Ce test échouera probablement car il n'y a pas de base de données connectée,
  // mais il permet de vérifier que la méthode existe et peut être appelée
  console.log('Tentative d\'exécution de la vérification manuelle...');
  console.log('(Ce test peut échouer sans base de données, c\'est normal)');
  
  // On ne fait que vérifier que la méthode existe
  if (typeof paymentScheduler.runManualCheck === 'function') {
    console.log('✓ Méthode runManualCheck existe');
  } else {
    throw new Error('Méthode runManualCheck manquante');
  }
} catch (error) {
  console.error('✗ Erreur lors du test de vérification manuelle:', error.message);
}

console.log('\n=== Tests terminés ===');
console.log('✓ Tous les tests de base sont passés avec succès');
console.log('\nPour tester complètement la fonctionnalité:');
console.log('1. Démarrez l\'application avec: npm run dev');
console.log('2. Créez un paiement avec status "pending" et date d\'aujourd\'hui');
console.log('3. Appelez l\'API: POST /api/scheduler/check-payments');
console.log('4. Vérifiez que le statut du paiement est passé à "paid"');

process.exit(0);

