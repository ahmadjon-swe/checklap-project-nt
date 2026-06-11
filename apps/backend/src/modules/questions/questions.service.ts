import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { Test } from '../tests/entities/test.entity';
import { Option } from '../options/entities/option.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private repo: Repository<Question>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Option) private optionRepo: Repository<Option>,
  ) {}

  async create(testId: string, teacherId: string, dto: CreateQuestionDto) {
    await this.ownerTest(testId, teacherId);
    const count = await this.repo.count({ where: { testId } });
    const question = this.repo.create({ ...dto, testId, orderIndex: count });
    const saved = await this.repo.save(question);

    if (dto.options?.length) {
      const options = dto.options.map((o, i) =>
        this.optionRepo.create({
          ...o,
          questionId: saved.id,
          orderIndex: o.orderIndex ?? i,
        }),
      );
      await this.optionRepo.save(options);
    }

    return this.findOne(testId, saved.id, teacherId);
  }

  async bulkCreate(
    testId: string,
    teacherId: string,
    dtos: CreateQuestionDto[],
  ) {
    await this.ownerTest(testId, teacherId);
    const results: any[] = [];
    for (const dto of dtos) {
      results.push(await this.create(testId, teacherId, dto));
    }
    return results;
  }

  async findAll(testId: string) {
    return this.repo.find({
      where: { testId },
      relations: { options: true },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(testId: string, id: string, _userId: string) {
    const question = await this.repo.findOne({
      where: { id, testId },
      relations: { options: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update(
    testId: string,
    id: string,
    teacherId: string,
    dto: UpdateQuestionDto,
  ) {
    await this.ownerTest(testId, teacherId);
    const question = await this.repo.findOne({ where: { id, testId } });
    if (!question) throw new NotFoundException();
    const { options: _options, ...questionData } = dto;
    Object.assign(question, questionData);
    return this.repo.save(question);
  }

  async remove(testId: string, id: string, teacherId: string) {
    await this.ownerTest(testId, teacherId);
    const question = await this.repo.findOne({ where: { id, testId } });
    if (!question) throw new NotFoundException();
    await this.repo.softRemove(question);
    return { message: 'Question deleted' };
  }

  private async ownerTest(testId: string, teacherId: string) {
    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacherId !== teacherId) throw new ForbiddenException();
    return test;
  }
}
