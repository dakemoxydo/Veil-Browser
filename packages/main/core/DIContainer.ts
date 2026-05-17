export class DIContainer {
  private instances = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  public register<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  public registerInstance<T>(token: string, instance: T): void {
    this.instances.set(token, instance);
  }

  public resolve<T>(token: string): T {
    // Check instances first (singletons)
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    // Check factories
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory() as T;
      // Cache the result as a singleton
      this.instances.set(token, instance);
      return instance;
    }

    throw new Error(`DIContainer: No registration found for token "${token}"`);
  }

  public has(token: string): boolean {
    return this.instances.has(token) || this.factories.has(token);
  }

  public clear(): void {
    this.instances.clear();
    this.factories.clear();
  }
}
