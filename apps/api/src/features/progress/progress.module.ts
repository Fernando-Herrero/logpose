import { Module } from '@nestjs/common';

import { UsersPersistenceModule } from '../users/users-persistence.module.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [UsersPersistenceModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
