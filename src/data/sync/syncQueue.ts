/**
 * Sync Queue — Niveau 2 (Offline avancé)
 *
 * Ce fichier contiendra la file d'attente des opérations
 * à synchroniser quand l'appareil retrouve la connexion.
 *
 * Implémentation prévue en Niveau 2.
 */

export interface SyncQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  payload: unknown;
  createdAt: string;
}

// TODO: Niveau 2 — Implémenter la gestion de la queue
