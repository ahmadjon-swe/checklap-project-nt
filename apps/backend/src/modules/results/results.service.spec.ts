import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResultsService } from './results.service';
import { Result } from './entities/result.entity';
import { TestSession } from '../sessions/entities/test-session.entity';
import { SessionAnswer } from '../sessions/entities/session-answer.entity';
import { Question } from '../questions/entities/question.entity';
import { Option } from '../options/entities/option.entity';
import { Test as TestEntity } from '../tests/entities/test.entity';
import { TestGroup } from '../tests/entities/test-group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';

/**
 * Scoring is the part of the platform where a silent bug is most expensive,
 * so these tests pin down computeAndSave against a controlled set of
 * questions/options/answers.
 */
describe('ResultsService.computeAndSave', () => {
  let service: ResultsService;
  let resultRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let questionRepo: { find: jest.Mock };
  let answerRepo: { find: jest.Mock };
  let testRepo: { findOne: jest.Mock };

  // q1: single-correct (score 2), q2: multi-correct (score 3)
  const questions = [
    {
      id: 'q1',
      score: 2,
      options: [
        { id: 'o1a', isCorrect: true },
        { id: 'o1b', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      score: 3,
      options: [
        { id: 'o2a', isCorrect: true },
        { id: 'o2b', isCorrect: true },
        { id: 'o2c', isCorrect: false },
      ],
    },
  ];

  const session = {
    id: 'sess1',
    testId: 'test1',
    studentId: 'student1',
  } as TestSession;

  beforeEach(async () => {
    resultRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'res1', ...x })),
    };
    questionRepo = { find: jest.fn().mockResolvedValue(questions) };
    answerRepo = { find: jest.fn() };
    testRepo = {
      findOne: jest.fn().mockResolvedValue({ passingThreshold: null }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: getRepositoryToken(Result), useValue: resultRepo },
        { provide: getRepositoryToken(TestSession), useValue: {} },
        { provide: getRepositoryToken(SessionAnswer), useValue: answerRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(Option), useValue: {} },
        { provide: getRepositoryToken(TestEntity), useValue: testRepo },
        { provide: getRepositoryToken(TestGroup), useValue: {} },
        { provide: getRepositoryToken(GroupMember), useValue: {} },
      ],
    }).compile();

    service = module.get(ResultsService);
  });

  it('returns the existing result without recomputing (idempotent)', async () => {
    resultRepo.findOne.mockResolvedValueOnce({ id: 'existing' });
    const result = await service.computeAndSave(session);
    expect(result).toEqual({ id: 'existing' });
    expect(resultRepo.save).not.toHaveBeenCalled();
  });

  it('awards full score when every answer is correct', async () => {
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1a'], timeSpentSeconds: 10 },
      {
        questionId: 'q2',
        selectedOptionIds: ['o2a', 'o2b'],
        timeSpentSeconds: 20,
      },
    ]);

    const r = await service.computeAndSave(session);

    expect(r.rawScore).toBe(5);
    expect(r.maxPossibleScore).toBe(5);
    expect(r.percentage).toBe(100);
    expect(r.correctCount).toBe(2);
    expect(r.incorrectCount).toBe(0);
    expect(r.unansweredCount).toBe(0);
    expect(r.timeTakenSeconds).toBe(30);
  });

  it('requires an exact match for multi-select questions', async () => {
    // q2 missing one correct option -> incorrect, no partial credit
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1a'] },
      { questionId: 'q2', selectedOptionIds: ['o2a'] },
    ]);

    const r = await service.computeAndSave(session);

    expect(r.rawScore).toBe(2);
    expect(r.correctCount).toBe(1);
    expect(r.incorrectCount).toBe(1);
    expect(r.percentage).toBe(40);
  });

  it('counts unanswered questions separately from incorrect ones', async () => {
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1b'] }, // wrong
      // q2 not answered at all
    ]);

    const r = await service.computeAndSave(session);

    expect(r.rawScore).toBe(0);
    expect(r.correctCount).toBe(0);
    expect(r.incorrectCount).toBe(1);
    expect(r.unansweredCount).toBe(1);
  });

  it('marks passed=true when percentage meets the threshold', async () => {
    testRepo.findOne.mockResolvedValue({ passingThreshold: 50 });
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1a'] },
      { questionId: 'q2', selectedOptionIds: ['o2a', 'o2b'] },
    ]);

    const r = await service.computeAndSave(session);
    expect(r.passed).toBe(true);
  });

  it('marks passed=false when percentage is below the threshold', async () => {
    testRepo.findOne.mockResolvedValue({ passingThreshold: 90 });
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1a'] }, // 2/5 = 40%
    ]);

    const r = await service.computeAndSave(session);
    expect(r.passed).toBe(false);
  });

  it('leaves passed=null when the test has no threshold', async () => {
    answerRepo.find.mockResolvedValue([
      { questionId: 'q1', selectedOptionIds: ['o1a'] },
    ]);

    const r = await service.computeAndSave(session);
    expect(r.passed).toBeNull();
  });
});
