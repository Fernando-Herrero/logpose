import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersPersistenceModule } from '../users/users-persistence.module.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { PostsPersistenceModule } from './posts-persistence.module.js';

@Module({
  imports: [
    PostsPersistenceModule,
    UsersPersistenceModule,
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
