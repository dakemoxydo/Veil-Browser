import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger, IStateBroadcaster } from './interfaces';

export abstract class BaseService {
  public abstract readonly name: string;

  constructor(
    protected readonly eventBus: IEventBus,
    protected readonly errorHandler: IErrorHandler,
    protected readonly logger: ILogger,
    protected readonly stateBroadcaster?: IStateBroadcaster,
  ) {}

  public abstract init(): void | Promise<void>;

  public handleAction?(action: VeilAction): void | Promise<void>;

  public destroy(): void {
    // Override in subclasses to clean up listeners
  }

  protected broadcast(patch: Record<string, unknown>): void {
    if (this.stateBroadcaster) {
      this.stateBroadcaster.patch(patch);
    }
  }
}
