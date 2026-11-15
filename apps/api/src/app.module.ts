import './integrations/orpc/orpc-context.js';

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ORPCModule } from '@orpc/nest';

import { CoreModule } from './core.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { HealthModule } from './features/health/health.module.js';
import { PostsModule } from './features/posts/posts.module.js';
import { SerieModule } from './features/serie/serie.module.js';
import { UploadModule } from './features/upload/upload.module.js';
import { UsersModule } from './features/users/users.module.js';
import { AllExceptionsFilter } from './integrations/http/all-exceptions.filter.js';
import { orpcModuleOptions } from './integrations/orpc/orpc.config.js';
import { OrpcDocsController } from './integrations/orpc/orpc-docs.controller.js';

@Module({
  imports: [
    CoreModule,
    ORPCModule.forRootAsync(orpcModuleOptions),
    AuthModule,
    UsersModule,
    HealthModule,
    SerieModule,
    PostsModule,
    UploadModule,
  ],
  controllers: [OrpcDocsController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
