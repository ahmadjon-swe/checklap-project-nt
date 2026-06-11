import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Question, Difficulty } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { Test } from '../tests/entities/test.entity';
import { Result } from '../results/entities/result.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Group } from '../groups/entities/group.entity';

@Injectable()
export class ImportExportService {
  constructor(
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Option) private optionRepo: Repository<Option>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
  ) {}

  async importQuestions(
    testId: string,
    teacherId: string,
    file: Express.Multer.File,
  ) {
    const test = await this.testRepo.findOne({
      where: { id: testId, teacherId },
    });
    if (!test) throw new NotFoundException('Test not found');

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return this.importFromExcel(testId, file.buffer);
    }
    if (ext === 'csv') {
      return this.importFromCsv(testId, file.buffer);
    }
    throw new BadRequestException(
      'Unsupported file format. Use .xlsx, .xls, or .csv',
    );
  }

  private async importFromExcel(testId: string, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new BadRequestException('Empty spreadsheet');

    const questions: Question[] = [];
    let currentQuestion: Partial<Question> | null = null;
    const currentOptions: Partial<Option>[] = [];

    // Expected columns: body | explanation | difficulty | score | topic | option1 | correct1 | option2 | correct2 ...
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const body = String(row.getCell(1).value || '').trim();
      if (!body) return;

      if (currentQuestion) {
        this.saveQuestionWithOptions(questions, currentQuestion, [
          ...currentOptions,
        ]);
        currentOptions.length = 0;
      }

      currentQuestion = {
        testId,
        body,
        explanation: String(row.getCell(2).value || '') || undefined,
        difficulty:
          (String(
            row.getCell(3).value || 'medium',
          ).toLowerCase() as Difficulty) || Difficulty.MEDIUM,
        score: parseFloat(String(row.getCell(4).value || '1')) || 1,
        topic: String(row.getCell(5).value || '') || undefined,
        orderIndex: questions.length,
      };

      // options start at col 6, in pairs: text | isCorrect
      for (let col = 6; col <= 20; col += 2) {
        const optBody = String(row.getCell(col).value || '').trim();
        if (!optBody) break;
        const isCorrect =
          String(row.getCell(col + 1).value || '').toLowerCase() === 'true';
        currentOptions.push({
          body: optBody,
          isCorrect,
          orderIndex: currentOptions.length,
        });
      }
    });

    if (currentQuestion) {
      this.saveQuestionWithOptions(questions, currentQuestion, [
        ...currentOptions,
      ]);
    }

    const saved = await this.questionRepo.save(questions);
    return {
      imported: saved.length,
      message: `Successfully imported ${saved.length} questions`,
    };
  }

  private saveQuestionWithOptions(
    questions: Question[],
    qData: Partial<Question>,
    opts: Partial<Option>[],
  ) {
    const q = this.questionRepo.create(qData as any) as unknown as Question;
    q.options = opts.map(
      (o, i) =>
        this.optionRepo.create({
          ...o,
          orderIndex: o.orderIndex ?? i,
        } as any) as unknown as Option,
    );
    questions.push(q);
  }

  private async importFromCsv(testId: string, buffer: Buffer) {
    const lines = buffer.toString('utf8').split('\n');
    const questions: Question[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .split(',')
        .map((c) => c.trim().replace(/^"|"$/g, ''));
      if (!cols[0]) continue;

      const q = this.questionRepo.create({
        testId,
        body: cols[0],
        explanation: cols[1] || undefined,
        difficulty: (cols[2] as Difficulty) || Difficulty.MEDIUM,
        score: parseFloat(cols[3]) || 1,
        topic: cols[4] || undefined,
        orderIndex: questions.length,
      });

      const options: Option[] = [];
      for (let j = 5; j < cols.length - 1; j += 2) {
        if (!cols[j]) break;
        options.push(
          this.optionRepo.create({
            body: cols[j],
            isCorrect: cols[j + 1]?.toLowerCase() === 'true',
            orderIndex: options.length,
          } as any) as unknown as Option,
        );
      }
      q.options = options;
      questions.push(q);
    }

    const saved = await this.questionRepo.save(questions);
    return {
      imported: saved.length,
      message: `Successfully imported ${saved.length} questions`,
    };
  }

  async exportQuestions(
    testId: string,
    teacherId: string,
    format: 'xlsx' | 'csv' | 'json',
  ) {
    const test = await this.testRepo.findOne({
      where: { id: testId, teacherId },
    });
    if (!test) throw new NotFoundException('Test not found');

    const questions = await this.questionRepo.find({
      where: { testId },
      relations: { options: true },
      order: { orderIndex: 'ASC' },
    });

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `${test.title}-questions.json`,
        data: JSON.stringify(questions, null, 2),
      };
    }

    if (format === 'csv') {
      const lines = [
        'body,explanation,difficulty,score,topic,option1,correct1,option2,correct2,option3,correct3,option4,correct4',
      ];
      for (const q of questions) {
        const optCols = q.options
          .flatMap((o) => [`"${o.body}"`, o.isCorrect.toString()])
          .join(',');
        lines.push(
          `"${q.body}","${q.explanation || ''}",${q.difficulty},${q.score},"${q.topic || ''}",${optCols}`,
        );
      }
      return {
        contentType: 'text/csv',
        filename: `${test.title}-questions.csv`,
        data: lines.join('\n'),
      };
    }

    // xlsx
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Questions');
    sheet.addRow([
      'Body',
      'Explanation',
      'Difficulty',
      'Score',
      'Topic',
      'Option1',
      'Correct1',
      'Option2',
      'Correct2',
      'Option3',
      'Correct3',
      'Option4',
      'Correct4',
    ]);
    for (const q of questions) {
      const row: any[] = [
        q.body,
        q.explanation || '',
        q.difficulty,
        q.score,
        q.topic || '',
      ];
      for (const o of q.options) {
        row.push(o.body, o.isCorrect ? 'true' : 'false');
      }
      sheet.addRow(row);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${test.title}-questions.xlsx`,
      data: buffer,
    };
  }

  async exportResults(
    testId: string,
    teacherId: string,
    format: 'xlsx' | 'csv' | 'json',
    _groupId?: string,
  ) {
    const test = await this.testRepo.findOne({
      where: { id: testId, teacherId },
    });
    if (!test) throw new NotFoundException('Test not found');

    const query = this.resultRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.student', 'student')
      .where('r.test_id = :testId', { testId });

    const results = await query.orderBy('r.computed_at', 'DESC').getMany();

    const rows = results.map((r) => ({
      student: `${r.student.firstName} ${r.student.lastName}`,
      email: r.student.email,
      rawScore: r.rawScore,
      maxScore: r.maxPossibleScore,
      percentage: r.percentage,
      passed: r.passed,
      correct: r.correctCount,
      incorrect: r.incorrectCount,
      unanswered: r.unansweredCount,
      timeTaken: r.timeTakenSeconds,
      submittedAt: r.computedAt,
    }));

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `${test.title}-results.json`,
        data: JSON.stringify(rows, null, 2),
      };
    }

    if (format === 'csv') {
      const headers = Object.keys(rows[0] || {}).join(',');
      const lines = [
        headers,
        ...rows.map((r) =>
          Object.values(r)
            .map((v) => `"${v}"`)
            .join(','),
        ),
      ];
      return {
        contentType: 'text/csv',
        filename: `${test.title}-results.csv`,
        data: lines.join('\n'),
      };
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');
    if (rows.length) {
      sheet.addRow(Object.keys(rows[0]));
      rows.forEach((r) => sheet.addRow(Object.values(r)));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${test.title}-results.xlsx`,
      data: buffer,
    };
  }
}
