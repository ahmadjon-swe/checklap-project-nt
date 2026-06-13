import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { TestSession } from '../sessions/entities/test-session.entity';
import { SessionAnswer } from '../sessions/entities/session-answer.entity';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { Test } from '../tests/entities/test.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { ResultVisibility } from '../tests/entities/test.entity';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result) private repo: Repository<Result>,
    @InjectRepository(TestSession) private sessionRepo: Repository<TestSession>,
    @InjectRepository(SessionAnswer)
    private answerRepo: Repository<SessionAnswer>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Option) private optionRepo: Repository<Option>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(TestGroup) private testGroupRepo: Repository<TestGroup>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
  ) {}

  async computeAndSave(session: TestSession): Promise<Result> {
    const existing = await this.repo.findOne({
      where: { sessionId: session.id },
    });
    if (existing) return existing;

    const questions = await this.questionRepo.find({
      where: { testId: session.testId },
      relations: { options: true },
    });

    const answers = await this.answerRepo.find({
      where: { sessionId: session.id },
    });
    const answerMap = new Map(
      answers.map((a) => [a.questionId, a.selectedOptionIds]),
    );

    let rawScore = 0;
    let maxPossibleScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    for (const question of questions) {
      maxPossibleScore += Number(question.score);
      const correctIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort();
      const selectedIds = (answerMap.get(question.id) || []).sort();

      if (!selectedIds.length) {
        unansweredCount++;
        continue;
      }

      const isCorrect =
        correctIds.length === selectedIds.length &&
        correctIds.every((id, i) => id === selectedIds[i]);

      if (isCorrect) {
        rawScore += Number(question.score);
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const timeTaken = answers.reduce(
      (sum, a) => sum + (a.timeSpentSeconds || 0),
      0,
    );
    const percentage =
      maxPossibleScore > 0 ? (rawScore / maxPossibleScore) * 100 : 0;

    const test = await this.testRepo.findOne({ where: { id: session.testId } });
    const passed =
      test?.passingThreshold != null
        ? percentage >= Number(test.passingThreshold)
        : null;

    const result = await this.repo.save(
      this.repo.create({
        sessionId: session.id,
        studentId: session.studentId,
        testId: session.testId,
        rawScore,
        maxPossibleScore,
        percentage,
        passed,
        totalQuestions: questions.length,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSeconds: timeTaken,
      }),
    );

    return result;
  }

  async getResult(sessionId: string, userId: string, role: UserRole) {
    const result = await this.repo.findOne({
      where: { sessionId },
      relations: { session: true, test: true },
    });
    if (!result) throw new NotFoundException('Result not found');

    if (role === UserRole.STUDENT && result.studentId !== userId)
      throw new ForbiddenException();
    if (role === UserRole.TEACHER && result.test.teacherId !== userId)
      throw new ForbiddenException();

    const test = result.test;
    const baseResult = {
      id: result.id,
      sessionId: result.sessionId,
      testTitle: test.title,
      percentage: result.percentage,
      passed: result.passed,
      timeTakenSeconds: result.timeTakenSeconds,
      computedAt: result.computedAt,
    };

    if (
      test.resultVisibility === ResultVisibility.PERCENTAGE_ONLY &&
      role === UserRole.STUDENT
    ) {
      return baseResult;
    }

    const answers = await this.answerRepo.find({ where: { sessionId } });
    const questions = await this.questionRepo.find({
      where: { testId: result.testId },
      relations: { options: true },
    });

    if (
      test.resultVisibility === ResultVisibility.CORRECT_INCORRECT &&
      role === UserRole.STUDENT
    ) {
      return {
        ...baseResult,
        rawScore: result.rawScore,
        maxPossibleScore: result.maxPossibleScore,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unansweredCount: result.unansweredCount,
        questions: questions.map((q) => ({
          id: q.id,
          body: q.body,
          isCorrect: this.isAnswerCorrect(q, answers),
        })),
      };
    }

    // full review mode or teacher
    return {
      ...baseResult,
      rawScore: result.rawScore,
      maxPossibleScore: result.maxPossibleScore,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      questions: questions.map((q) => {
        const answer = answers.find((a) => a.questionId === q.id);
        return {
          id: q.id,
          body: q.body,
          explanation: q.explanation,
          score: q.score,
          difficulty: q.difficulty,
          topic: q.topic,
          options: q.options.map((o) => ({
            id: o.id,
            body: o.body,
            isCorrect: o.isCorrect,
            isSelected: answer?.selectedOptionIds?.includes(o.id) || false,
          })),
          timeSpentSeconds: answer?.timeSpentSeconds,
          isCorrect: this.isAnswerCorrect(q, answers),
        };
      }),
    };
  }

  async getTestResults(testId: string, teacherId: string, groupId?: string) {
    const test = await this.testRepo.findOne({
      where: { id: testId, teacherId },
    });
    if (!test) throw new NotFoundException('Test not found');

    let studentIds: string[] | undefined;
    if (groupId) {
      const members = await this.memberRepo.find({
        where: { groupId, isActive: true },
      });
      studentIds = members.map((m) => m.studentId);
    }

    const query = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.student', 'student')
      .where('r.test_id = :testId', { testId });

    if (studentIds?.length) {
      query.andWhere('r.student_id IN (:...studentIds)', { studentIds });
    }

    return query.orderBy('r.computed_at', 'DESC').getMany();
  }

  async getStudentResults(
    studentId: string,
    requesterId: string,
    role: UserRole,
  ) {
    if (role === UserRole.STUDENT && studentId !== requesterId)
      throw new ForbiddenException();
    const results = await this.repo.find({
      where: { studentId },
      relations: { test: true },
      order: { computedAt: 'DESC' },
    });
    return results.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      testId: r.testId,
      testTitle: r.test?.title ?? null,
      percentage: r.percentage,
      passed: r.passed,
      rawScore: r.rawScore,
      maxPossibleScore: r.maxPossibleScore,
      correctCount: r.correctCount,
      incorrectCount: r.incorrectCount,
      unansweredCount: r.unansweredCount,
      timeTakenSeconds: r.timeTakenSeconds,
      computedAt: r.computedAt,
    }));
  }

  private isAnswerCorrect(
    question: Question,
    answers: SessionAnswer[],
  ): boolean {
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer || !answer.selectedOptionIds?.length) return false;
    const correctIds = question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id)
      .sort();
    const selectedIds = [...answer.selectedOptionIds].sort();
    return (
      correctIds.length === selectedIds.length &&
      correctIds.every((id, i) => id === selectedIds[i])
    );
  }
}
