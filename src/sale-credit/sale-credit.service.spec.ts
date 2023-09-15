import { Test, TestingModule } from '@nestjs/testing';
import { SaleCreditService } from './sale-credit.service';

describe('SaleCreditService', () => {
  let service: SaleCreditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaleCreditService],
    }).compile();

    service = module.get<SaleCreditService>(SaleCreditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
