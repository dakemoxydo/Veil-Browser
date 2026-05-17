import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger } from './interfaces';

export abstract class BaseService {
  public abstract readonly name: string;

  constructor(
    protected readonly eventBus: IEventBus,
    protected readonly errorHandler: IErrorHandler,
    protected readonly logger: ILogger,
  ) {}

  public abstract init(): void | Promise<void>;

  public handleAction?(action: VeilAction): void | Promise<void>;
}
