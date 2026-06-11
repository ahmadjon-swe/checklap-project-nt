import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Liveness probe — the process is up and serving requests.
   */
  @Public()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — verifies the database is reachable so load balancers
   * and orchestrators don't route traffic to an instance that can't serve it.
   */
  @Public()
  @Get('health/ready')
  async ready(): Promise<{ status: string; database: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
