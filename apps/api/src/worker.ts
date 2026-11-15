import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { NotificationsWorkerModule } from './features/notifications/notifications-worker.module.js';

// Contexto Nest sin servidor HTTP: solo el worker y lo que inyecta.
const app = await NestFactory.createApplicationContext(
  NotificationsWorkerModule,
);
app.enableShutdownHooks();
