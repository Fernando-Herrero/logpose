import type { MongoClientOptions } from 'mongodb';

/**
 * Opciones del cliente, compartidas por la app y sus tests de integración. Sin
 * `ignoreUndefined`, un opcional sin valor se inserta como `null` y rompe los
 * schemas de salida.
 */
export const mongoClientOptions = {
  ignoreUndefined: true,
  // Con Mongo caído, fallar a los 5 s y no a los 30 del driver: la petición da error en vez de quedarse colgada.
  serverSelectionTimeoutMS: 5_000,
} satisfies MongoClientOptions;
