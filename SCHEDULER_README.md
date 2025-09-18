# Scheduler de Paiements Automatique

## Description

Cette fonctionnalité permet de changer automatiquement le statut des paiements de "pending" (en attente) à "paid" (payé) lorsque leur date d'échéance arrive.

## Comment ça fonctionne

1. **Démarrage automatique** : Le scheduler se lance automatiquement quand l'application démarre
2. **Vérification périodique** : Toutes les heures, le système vérifie les paiements en attente
3. **Mise à jour automatique** : Les paiements avec une date d'aujourd'hui ou antérieure passent automatiquement de "pending" à "paid"

## Utilisation

### Créer un paiement programmé

Quand vous créez un paiement via l'API, utilisez le statut "pending" pour les paiements futurs :

```json
POST /api/payments
{
  "employeeId": 1,
  "amountCFA": 500000,
  "amountUSD": 750.00,
  "date": "2025-09-16",
  "status": "pending"
}
```

### Vérification manuelle

Vous pouvez déclencher manuellement la vérification des paiements :

```bash
POST /api/scheduler/check-payments
```

### Statut du scheduler

Pour vérifier si le scheduler fonctionne :

```bash
GET /api/scheduler/status
```

### Redémarrer le scheduler

En cas de problème, vous pouvez redémarrer le scheduler :

```bash
POST /api/scheduler/restart
```

## Exemple d'utilisation

1. **Aujourd'hui (15 septembre 2025)** : Créez un paiement avec la date du 16 septembre et le statut "pending"
2. **Demain (16 septembre 2025)** : Le système changera automatiquement le statut à "paid"

## Logs

Le scheduler affiche des logs dans la console pour suivre son activité :

```
Starting payment scheduler...
Payment scheduler started - checking every hour
Checking pending payments...
Found 2 pending payment(s) to process
Payment PAY-2025-001 for employee John Doe updated from 'pending' to 'paid'
Payment PAY-2025-002 for employee Jane Smith updated from 'pending' to 'paid'
Finished processing pending payments
```

## Configuration

- **Fréquence de vérification** : 1 heure (configurable dans `paymentScheduler.js`)
- **Statuts gérés** : "pending" → "paid"
- **Critère de mise à jour** : Date du paiement ≤ date actuelle

## Fichiers modifiés/ajoutés

1. `src/services/paymentScheduler.js` - Service principal du scheduler
2. `src/routes/scheduler.js` - Routes API pour le monitoring
3. `src/server.js` - Intégration du scheduler au démarrage
4. `src/app.js` - Ajout des routes scheduler

## Tests

Exécutez le script de test pour vérifier le bon fonctionnement :

```bash
node test-scheduler.js
```

## Arrêt propre

Le scheduler s'arrête automatiquement quand l'application se ferme (SIGINT/SIGTERM).

