import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Option } from './entities/option.entity';
import { Question } from '../questions/entities/question.entity';
import { Test } from '../tests/entities/test.entity';
import { CreateOptionDto, UpdateOptionDto } from './dto/option.dto';

@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(Option) private repo: Repository<Option>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
  ) {}

  async create(questionId: string, teacherId: string, dto: CreateOptionDto) {
    await this.ownerQuestion(questionId, teacherId);
    const count = await this.repo.count({ where: { questionId } });
    const option = this.repo.create({
      ...dto,
      questionId,
      orderIndex: dto.orderIndex ?? count,
    });
    return this.repo.save(option);
  }

  async update(
    questionId: string,
    id: string,
    teacherId: string,
    dto: UpdateOptionDto,
  ) {
    await this.ownerQuestion(questionId, teacherId);
    const option = await this.repo.findOne({ where: { id, questionId } });
    if (!option) throw new NotFoundException('Option not found');
    Object.assign(option, dto);
    return this.repo.save(option);
  }

  async remove(questionId: string, id: string, teacherId: string) {
    await this.ownerQuestion(questionId, teacherId);
    const option = await this.repo.findOne({ where: { id, questionId } });
    if (!option) throw new NotFoundException('Option not found');
    await this.repo.remove(option);
    return { message: 'Option deleted' };
  }

  private async ownerQuestion(questionId: string, teacherId: string) {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { test: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.test.teacherId !== teacherId) throw new ForbiddenException();
    return question;
  }
}
