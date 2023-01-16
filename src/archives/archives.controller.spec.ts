import { Test, TestingModule } from '@nestjs/testing';
import { ArchivesController } from './archives.controller';

describe('ArchivesController', () => {
  let controller: ArchivesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchivesController],
    }).compile();

    controller = module.get<ArchivesController>(ArchivesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
