import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = new Redis(process.env.REDIS_URL!, { lazyConnect: true });
  private connected = false;

  private async ensureConnected(): Promise<boolean> {
    if (this.connected) return true;
    try {
      await this.client.connect();
      this.connected = true;
      return true;
    } catch (error) {
      this.logger.warn(`Redis unavailable, caching disabled: ${(error as Error).message}`);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!(await this.ensureConnected())) return undefined;
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!(await this.ensureConnected())) return;
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureConnected())) return;
    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) this.client.disconnect();
  }
}
