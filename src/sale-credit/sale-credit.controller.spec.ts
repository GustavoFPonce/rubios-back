import { Test, TestingModule } from '@nestjs/testing';
import { SaleCreditController } from './sale-credit.controller';

describe('SaleCreditController', () => {
  let controller: SaleCreditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SaleCreditController],
    }).compile();

    controller = module.get<SaleCreditController>(SaleCreditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
