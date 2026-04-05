import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/devices/stats (GET) - should return public stats', () => {
    return request(app.getHttpServer())
      .get('/api/v1/devices/stats')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('online');
        expect(res.body).toHaveProperty('offline');
        expect(res.body).toHaveProperty('totalWater');
        expect(res.body).toHaveProperty('totalEnergy');
      });
  });

  it('/api/v1/auth/login (POST) - should return 401 for invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'invalid',
        password: 'invalid',
      })
      .expect(401);
  });

  it('/api/v1/auth/login (POST) - should validate input', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);
  });
});

