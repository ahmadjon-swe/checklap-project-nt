import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: { query } as Partial<DataSource>,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns { status: "ok" }', () => {
      expect(appController.health()).toEqual({ status: 'ok' });
    });
  });

  describe('ready', () => {
    it('reports the database up when the ping succeeds', async () => {
      query.mockResolvedValueOnce([{ '?column?': 1 }]);
      await expect(appController.ready()).resolves.toEqual({
        status: 'ok',
        database: 'up',
      });
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('throws 503 when the database is unreachable', async () => {
      query.mockRejectedValueOnce(new Error('connection refused'));
      await expect(appController.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
