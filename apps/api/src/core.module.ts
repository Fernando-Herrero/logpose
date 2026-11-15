import { MongoModule } from '@jperezmart/nest-mongodb';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ServerEnv, validateEnv } from './integrations/env/server.js';
import { mongoClientOptions } from './integrations/mongodb/mongodb.config.js';

const mode = process.env.NODE_ENV ?? 'development';

/** Entorno validado y conexión a Mongo, compartidos por la API y el worker. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env'],
      validate: validateEnv,
    }),
    MongoModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServerEnv, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        dbName: config.get('MONGODB_DBNAME', { infer: true }),
        ...mongoClientOptions,
      }),
    }),
  ],
})
export class CoreModule {}
