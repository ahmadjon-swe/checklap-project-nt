import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { Result } from '../results/entities/result.entity';
import { ItemStat } from './entities/item-stat.entity';
import { Question } from '../questions/entities/question.entity';
import { SessionAnswer } from '../sessions/entities/session-answer.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Test } from '../tests/entities/test.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    @InjectRepository(ItemStat) private itemStatRepo: Repository<ItemStat>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(SessionAnswer)
    private answerRepo: Repository<SessionAnswer>,
    @InjectRepository(TestGroup) private testGroupRepo: Repository<TestGroup>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
  ) {}

  async getOverview(teacherId: string) {
    const tests = await this.testRepo.find({ where: { teacherId } });
    const testIds = tests.map((t) => t.id);
    if (!testIds.length)
      return { totalTests: 0, totalStudents: 0, avgScore: 0 };

    const results = await this.resultRepo
      .createQueryBuilder('r')
      .where('r.test_id IN (:...testIds)', { testIds })
      .getMany();

    const avgScore = results.length
      ? results.reduce((s, r) => s + Number(r.percentage), 0) / results.length
      : 0;

    return {
      totalTests: tests.length,
      publishedTests: tests.filter((t) => t.isPublished).length,
      totalAttempts: results.length,
      avgScore: parseFloat(avgScore.toFixed(2)),
      passRate: results.length
        ? parseFloat(
            (
              (results.filter((r) => r.passed).length / results.length) *
              100
            ).toFixed(2),
          )
        : null,
    };
  }

  async getTestAnalytics(testId: string, teacherId: string) {
    await this.ownerTest(testId, teacherId);
    const results = await this.resultRepo.find({
      where: { testId },
      relations: { student: true },
    });

    if (!results.length)
      return { testId, totalAttempts: 0, avgScore: 0, results: [] };

    const scores = results.map((r) => Number(r.percentage));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);

    return {
      testId,
      totalAttempts: results.length,
      avgScore: parseFloat(avg.toFixed(2)),
      highestScore: sorted[sorted.length - 1],
      lowestScore: sorted[0],
      medianScore: sorted[Math.floor(sorted.length / 2)],
      passRate: parseFloat(
        (
          (results.filter((r) => r.passed).length / results.length) *
          100
        ).toFixed(2),
      ),
      avgTimeSecs: Math.round(
        results.reduce((s, r) => s + r.timeTakenSeconds, 0) / results.length,
      ),
      results: results.map((r) => ({
        id: r.id,
        studentName: r.student
          ? `${r.student.firstName} ${r.student.lastName}`.trim()
          : null,
        studentEmail: r.student?.email ?? null,
        percentage: r.percentage,
        passed: r.passed,
        computedAt: r.computedAt,
      })),
    };
  }

  async exportResultsCsv(testId: string, teacherId: string): Promise<string> {
    const test = await this.ownerTest(testId, teacherId);
    const results = await this.resultRepo.find({
      where: { testId },
      relations: { student: true },
      order: { computedAt: 'DESC' },
    });

    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = [
      'Name',
      'Email',
      'Score (%)',
      'Correct',
      'Incorrect',
      'Unanswered',
      'Time (sec)',
      'Passed',
      'Date',
    ];
    const rows = results.map((r) =>
      [
        `${r.student?.firstName ?? ''} ${r.student?.lastName ?? ''}`.trim() ||
          'Guest',
        r.student?.email ?? '',
        Number(r.percentage).toFixed(1),
        r.correctCount,
        r.incorrectCount,
        r.unansweredCount,
        r.timeTakenSeconds,
        r.passed == null ? '' : r.passed ? 'Yes' : 'No',
        r.computedAt ? new Date(r.computedAt).toISOString().slice(0, 10) : '',
      ]
        .map(escape)
        .join(','),
    );

    return [`# ${test.title} — Results`, header.join(','), ...rows].join(
      '\r\n',
    );
  }

  async getItemAnalysis(testId: string, teacherId: string) {
    await this.ownerTest(testId, teacherId);
    const questions = await this.questionRepo.find({ where: { testId } });
    const questionIds = questions.map((q) => q.id);
    const stats = questionIds.length
      ? await this.itemStatRepo.find({ where: { questionId: In(questionIds) } })
      : [];

    const statMap = new Map(stats.map((s) => [s.questionId, s]));
    return questions.map((q) => {
      const stat = statMap.get(q.id);
      const totalAttempts = stat?.totalAttempts || 0;
      const correctAttempts = stat?.correctAttempts || 0;
      return {
        questionId: q.id,
        questionBody: q.body.substring(0, 80),
        topic: q.topic,
        difficulty: q.difficulty,
        totalAttempts,
        correctAttempts,
        correctRate: totalAttempts > 0 ? correctAttempts / totalAttempts : 0,
        difficultyIndex: stat?.difficultyIndex || 0,
        avgTimeSeconds: stat?.avgTimeSeconds || 0,
      };
    });
  }

  async getDashboardTable(teacherId: string) {
    const tests = await this.testRepo.find({
      where: { teacherId, isPublished: true },
    });
    const testIds = tests.map((t) => t.id);
    if (!testIds.length) return { groups: [], rows: [] };

    const testGroups = await this.testGroupRepo.find({
      where: { testId: In(testIds) },
      relations: { group: true },
    });

    const seenGroupIds = new Set<string>();
    const groups = testGroups
      .filter((tg) => {
        const seen = seenGroupIds.has(tg.groupId);
        seenGroupIds.add(tg.groupId);
        return !seen;
      })
      .map((tg) => ({ id: tg.groupId, name: tg.group.name }));

    const results = await this.resultRepo
      .createQueryBuilder('r')
      .where('r.test_id IN (:...testIds)', { testIds })
      .getMany();

    const resultMatrix = tests.map((test) => {
      const row: Record<string, any> = {
        testId: test.id,
        testTitle: test.title,
      };
      for (const group of groups) {
        const tg = testGroups.find(
          (x) => x.testId === test.id && x.groupId === group.id,
        );
        if (!tg) {
          row[group.id] = null;
          continue;
        }
        const groupResultsForTest = results.filter((r) => r.testId === test.id);
        if (!groupResultsForTest.length) {
          row[group.id] = { avg: null, count: 0 };
          continue;
        }
        const avg =
          groupResultsForTest.reduce((s, r) => s + Number(r.percentage), 0) /
          groupResultsForTest.length;
        row[group.id] = {
          avg: parseFloat(avg.toFixed(2)),
          count: groupResultsForTest.length,
        };
      }
      return row;
    });

    return { groups, rows: resultMatrix };
  }

  async getStudentProgress(studentId: string, teacherId: string) {
    const tests = await this.testRepo.find({ where: { teacherId } });
    const testIds = tests.map((t) => t.id);
    if (!testIds.length) return [];

    return this.resultRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.test', 'test')
      .where('r.student_id = :studentId', { studentId })
      .andWhere('r.test_id IN (:...testIds)', { testIds })
      .orderBy('r.computed_at', 'ASC')
      .getMany();
  }

  @Cron('*/5 * * * *')
  async refreshItemStats() {
    const questions = await this.questionRepo.find({
      relations: { options: true },
    });
    for (const question of questions) {
      const answers = await this.answerRepo.find({
        where: { questionId: question.id },
      });
      if (!answers.length) continue;
      const totalAttempts = answers.length;
      const avgTime =
        answers.reduce((s, a) => s + (a.timeSpentSeconds || 0), 0) /
        totalAttempts;

      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort();

      let correctAttempts = 0;
      for (const answer of answers) {
        const selectedIds = [...answer.selectedOptionIds].sort();
        if (
          correctOptionIds.length === selectedIds.length &&
          correctOptionIds.every((id, i) => id === selectedIds[i])
        ) {
          correctAttempts++;
        }
      }

      const difficultyIndex = correctAttempts / totalAttempts;

      await this.itemStatRepo.upsert(
        {
          questionId: question.id,
          totalAttempts,
          correctAttempts,
          avgTimeSeconds: avgTime,
          difficultyIndex,
        },
        ['questionId'],
      );
    }
  }

  private async ownerTest(testId: string, teacherId: string) {
    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacherId !== teacherId) throw new ForbiddenException();
    return test;
  }
}
