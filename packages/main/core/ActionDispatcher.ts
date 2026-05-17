import { VeilAction } from '@veil/shared';
import { ErrorSeverity } from './ErrorHandler';
import { ILogger, IErrorHandler } from './interfaces';
import { VeilService } from './ServiceRegistry';

export class ActionDispatcher {
  constructor(
    private logger: ILogger,
    private errorHandler: IErrorHandler,
  ) {}

  public async dispatch(action: VeilAction, services: VeilService[]): Promise<void> {
    this.logger.debug(`Action: ${action.type}`);
    for (const service of services) {
      if (service.handleAction) {
        try {
          await service.handleAction(action);
        } catch (error) {
          this.errorHandler.handle(
            'SERVICE_ACTION_FAILED',
            `Service ${service.name} failed to handle action ${action.type}: ${error}`,
            ErrorSeverity.MEDIUM,
            'ActionDispatcher'
          );
        }
      }
    }
  }
}
