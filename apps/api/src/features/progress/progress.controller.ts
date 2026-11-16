import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { contract } from '../../integrations/orpc/orpc.contract.js';
import { requireViewer } from '../../integrations/orpc/orpc-context.js';
import { ProgressService } from './progress.service.js';

@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Implement(contract.progress.set)
  set() {
    return implement(contract.progress.set).handler(({ input, context }) =>
      this.progressService.set(
        requireViewer(context.request).id,
        input.lastWatchedEpisode,
      ),
    );
  }
}
