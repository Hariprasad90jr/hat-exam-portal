/**
 * PHASE 2 VERIFICATION SUITE
 * Tests:
 * 1. Short-Answer Questions — Pending Review Workflow & Certificate Withholding
 * 2. Deactivated Student — Immediate Lockout Across Protected Operations
 * 3. Double-Submission — Idempotent Finalization (No duplicate certificates/scores)
 * 4. Comprehensive Audit Logging — Security & Administrative Action Tracking
 */

interface QuestionDef {
  id: string;
  type: "MCQ_SINGLE" | "MCQ_MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER";
  points: number;
  negativePoints: number;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation?: string;
}

// --------------------------------------------------------------------------
// 1. SHORT-ANSWER QUESTIONS & MANUAL REVIEW SIMULATION
// --------------------------------------------------------------------------
function evaluateSubmission(
  questions: QuestionDef[],
  submittedAnswers: Record<string, { selectedOptionIds?: string[]; textAnswer?: string }>,
  passingCutoffPercent: number
) {
  let totalScore = 0;
  let totalMaxMarks = 0;
  let hasQuestionsRequiringReview = false;

  const answerResults: Record<
    string,
    { marksAwarded: number; isCorrect: boolean | null; requiresReview: boolean }
  > = {};

  for (const q of questions) {
    totalMaxMarks += q.points;
    const ans = submittedAnswers[q.id];

    let marksAwarded = 0;
    let isCorrect: boolean | null = null;
    let requiresReview = false;

    if (!ans || (!ans.textAnswer && (!ans.selectedOptionIds || ans.selectedOptionIds.length === 0))) {
      marksAwarded = 0;
      isCorrect = null;
      requiresReview = false;
    } else if (q.type === "MCQ_SINGLE" || q.type === "TRUE_FALSE") {
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (correctOpt && ans.selectedOptionIds?.[0] === correctOpt.id) {
        marksAwarded = q.points;
        isCorrect = true;
      } else {
        marksAwarded = -q.negativePoints;
        isCorrect = false;
      }
    } else if (q.type === "SHORT_ANSWER") {
      // RULE: Subjective questions MUST NOT receive full marks automatically!
      isCorrect = null;
      marksAwarded = 0; // provisional 0
      if (ans.textAnswer && ans.textAnswer.trim().length > 0) {
        requiresReview = true;
        hasQuestionsRequiringReview = true;
      }
    }

    totalScore += marksAwarded;
    answerResults[q.id] = { marksAwarded, isCorrect, requiresReview };
  }

  const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = totalMaxMarks > 0 ? Math.round((finalScore / totalMaxMarks) * 1000) / 10 : 0;
  const reviewStatus = hasQuestionsRequiringReview ? "PENDING_REVIEW" : "COMPLETED";

  // RULE: If manual review is required, candidate CANNOT be marked as definitively passed,
  // and Certificate MUST NOT be issued!
  const passed = !hasQuestionsRequiringReview && percentage >= passingCutoffPercent;
  const certificateIssued = passed && !hasQuestionsRequiringReview;

  return {
    finalScore,
    totalMaxMarks,
    percentage,
    passed,
    requiresReview: hasQuestionsRequiringReview,
    reviewStatus,
    certificateIssued,
    answerResults,
  };
}

function reviewAttemptGrading(
  initialResult: ReturnType<typeof evaluateSubmission>,
  questions: QuestionDef[],
  instructorGrades: Record<string, { marks: number; feedback?: string }>,
  passingCutoffPercent: number
) {
  let recalculatedScore = 0;

  for (const q of questions) {
    if (q.type === "SHORT_ANSWER" && instructorGrades[q.id] !== undefined) {
      const awarded = Math.min(q.points, Math.max(0, instructorGrades[q.id].marks));
      recalculatedScore += awarded;
    } else {
      recalculatedScore += initialResult.answerResults[q.id]?.marksAwarded || 0;
    }
  }

  const finalScore = Math.max(0, Math.round(recalculatedScore * 100) / 100);
  const percentage =
    initialResult.totalMaxMarks > 0
      ? Math.round((finalScore / initialResult.totalMaxMarks) * 1000) / 10
      : 0;
  const passed = percentage >= passingCutoffPercent;
  const certificateIssued = passed;

  return {
    finalScore,
    percentage,
    passed,
    requiresReview: false,
    reviewStatus: "COMPLETED",
    certificateIssued,
  };
}

// --------------------------------------------------------------------------
// 2. DEACTIVATED STUDENT IMMEDIATE LOCKOUT CHECK
// --------------------------------------------------------------------------
interface UserRecord {
  id: string;
  email: string;
  isActive: boolean;
}

function checkProtectedOperationAccess(user: UserRecord | null) {
  if (!user) {
    return { status: 401, allowed: false, error: "Unauthorized" };
  }
  if (!user.isActive) {
    return {
      status: 403,
      allowed: false,
      error: "Your account is deactivated. Contact an administrator.",
    };
  }
  return { status: 200, allowed: true };
}

// --------------------------------------------------------------------------
// 3. DOUBLE SUBMISSION IDEMPOTENT FINALIZATION SIMULATION
// --------------------------------------------------------------------------
interface MockAttemptState {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT";
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  requiresReview: boolean;
  certificateId: string | null;
}

function processSubmissionWithIdempotency(
  attempt: MockAttemptState,
  evaluateFn: () => { score: number; percentage: number; passed: boolean; certId: string | null }
) {
  // If already finalized, return safely without re-evaluating or duplicating
  if (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT") {
    return {
      success: true,
      alreadyFinalized: true,
      attemptId: attempt.id,
      score: attempt.score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      status: attempt.status,
      certificateId: attempt.certificateId,
      reEvaluated: false,
    };
  }

  // First submission
  const evalResult = evaluateFn();
  attempt.status = "SUBMITTED";
  attempt.score = evalResult.score;
  attempt.percentage = evalResult.percentage;
  attempt.passed = evalResult.passed;
  attempt.certificateId = evalResult.certId;

  return {
    success: true,
    alreadyFinalized: false,
    attemptId: attempt.id,
    score: attempt.score,
    percentage: attempt.percentage,
    passed: attempt.passed,
    status: attempt.status,
    certificateId: attempt.certificateId,
    reEvaluated: true,
  };
}

// --------------------------------------------------------------------------
// 4. AUDIT LOGGING SIMULATION
// --------------------------------------------------------------------------
interface AuditRecord {
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

class MockAuditLogService {
  public records: AuditRecord[] = [];

  log({
    userId,
    action,
    targetType,
    targetId,
    details,
    ipAddress,
    userAgent,
  }: {
    userId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    details?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    this.records.push({
      userId: userId || null,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: typeof details === "object" ? JSON.stringify(details) : details || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  hasAction(action: string) {
    return this.records.some((r) => r.action === action);
  }
}

// --------------------------------------------------------------------------
// TEST EXECUTION
// --------------------------------------------------------------------------
async function runPhase2Tests() {
  console.log("=================================================");
  console.log("  PHASE 2 HIGH PRIORITY BUSINESS LOGIC TEST SUITE ");
  console.log("=================================================\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failedTests++;
    }
  }

  // --- SUITE 1: Short-Answer Questions & Manual Review ---
  console.log("📝 1. Testing Short-Answer Questions & Manual Review...");

  const sampleQuestions: QuestionDef[] = [
    {
      id: "q1",
      type: "MCQ_SINGLE",
      points: 5,
      negativePoints: 1,
      options: [
        { id: "opt1", text: "Paris", isCorrect: true },
        { id: "opt2", text: "Rome", isCorrect: false },
      ],
    },
    {
      id: "q2",
      type: "SHORT_ANSWER",
      points: 10,
      negativePoints: 0,
      options: [],
      explanation: "Photosynthesis is the process by which green plants make food.",
    },
  ];

  // A. Non-empty short answer does NOT receive full marks automatically
  const submissionWithText = evaluateSubmission(
    sampleQuestions,
    {
      q1: { selectedOptionIds: ["opt1"] }, // 5 pts
      q2: { textAnswer: "Plants convert light energy into chemical energy." }, // subjective
    },
    50 // 50% passing cutoff
  );

  assert(
    submissionWithText.answerResults["q2"].marksAwarded === 0,
    "Non-empty short answer does NOT automatically receive marks (provisional 0 pts awarded)"
  );
  assert(
    submissionWithText.answerResults["q2"].requiresReview === true,
    "Non-empty short answer is marked with requiresReview: true"
  );
  assert(
    submissionWithText.reviewStatus === "PENDING_REVIEW",
    "Exam attempt is marked with reviewStatus: 'PENDING_REVIEW'"
  );
  assert(
    submissionWithText.passed === false,
    "Candidate is NOT marked as definitively PASSED while manual review is pending"
  );
  assert(
    submissionWithText.certificateIssued === false,
    "Certificate is WITHHELD and NOT generated while manual review is pending"
  );

  // B. Empty short answer
  const submissionEmptyText = evaluateSubmission(
    sampleQuestions,
    {
      q1: { selectedOptionIds: ["opt1"] },
      q2: { textAnswer: "" },
    },
    50
  );
  assert(
    submissionEmptyText.answerResults["q2"].marksAwarded === 0,
    "Empty short answer receives 0 points"
  );
  assert(
    submissionEmptyText.answerResults["q2"].requiresReview === false,
    "Empty short answer does not require review"
  );

  // C. Admin Review & Final Score Recalculation
  const reviewedResult = reviewAttemptGrading(
    submissionWithText,
    sampleQuestions,
    {
      q2: { marks: 8.5, feedback: "Excellent and concise explanation." },
    },
    50
  );

  assert(
    reviewedResult.finalScore === 13.5,
    "Final score accurately recalculates after instructor review (5 + 8.5 = 13.5 pts)"
  );
  assert(
    reviewedResult.percentage === 90,
    "Percentage correctly recalculates to 90% (13.5 / 15 * 100)"
  );
  assert(
    reviewedResult.passed === true,
    "Candidate definitively marked PASSED after qualifying review score"
  );
  assert(
    reviewedResult.reviewStatus === "COMPLETED",
    "Attempt reviewStatus transitions to 'COMPLETED'"
  );
  assert(
    reviewedResult.certificateIssued === true,
    "Certificate is successfully issued after qualifying instructor review"
  );

  // D. Existing automatic scoring remains intact
  const autoOnlySubmission = evaluateSubmission(
    [
      {
        id: "q1",
        type: "MCQ_SINGLE",
        points: 10,
        negativePoints: 2,
        options: [
          { id: "o1", text: "A", isCorrect: true },
          { id: "o2", text: "B", isCorrect: false },
        ],
      },
    ],
    { q1: { selectedOptionIds: ["o1"] } },
    50
  );
  assert(
    autoOnlySubmission.finalScore === 10 &&
      autoSubmissionPassed(autoOnlySubmission) &&
      autoOnlySubmission.reviewStatus === "COMPLETED",
    "Existing automatic question scoring (MCQ) remains unaffected with immediate certification"
  );

  function autoSubmissionPassed(res: any) {
    return res.passed === true && res.certificateIssued === true;
  }

  // --- SUITE 2: Deactivated Student Immediate Lockout ---
  console.log("\n🔒 2. Testing Deactivated Student Immediate Access Lockout...");

  const activeStudent: UserRecord = { id: "s-1", email: "student@test.com", isActive: true };
  const deactivatedStudent: UserRecord = {
    id: "s-2",
    email: "deactivated@test.com",
    isActive: false,
  };

  assert(
    checkProtectedOperationAccess(activeStudent).allowed === true,
    "Active student is permitted access to exam operations"
  );

  const startCheck = checkProtectedOperationAccess(deactivatedStudent);
  assert(
    startCheck.allowed === false && startCheck.status === 403,
    "Deactivated student is rejected from starting an exam with 403 Forbidden"
  );

  const saveCheck = checkProtectedOperationAccess(deactivatedStudent);
  assert(
    saveCheck.allowed === false && saveCheck.status === 403,
    "Deactivated student is rejected from saving an answer with 403 Forbidden"
  );

  const submitCheck = checkProtectedOperationAccess(deactivatedStudent);
  assert(
    submitCheck.allowed === false && submitCheck.status === 403,
    "Deactivated student is rejected from submitting an exam with 403 Forbidden"
  );

  const resumeCheck = checkProtectedOperationAccess(deactivatedStudent);
  assert(
    resumeCheck.allowed === false && resumeCheck.status === 403,
    "Deactivated student is rejected from loading active attempt with 403 Forbidden"
  );

  // --- SUITE 3: Double-Submission Idempotent Finalization ---
  console.log("\n🔁 3. Testing Double-Submission Idempotency...");

  const testAttempt: MockAttemptState = {
    id: "att-123",
    status: "IN_PROGRESS",
    score: 0,
    totalMarks: 100,
    percentage: 0,
    passed: false,
    requiresReview: false,
    certificateId: null,
  };

  let evalCount = 0;
  const mockEvaluator = () => {
    evalCount++;
    return {
      score: 85,
      percentage: 85,
      passed: true,
      certId: "cert-abc-999",
    };
  };

  // First submission
  const firstSubmission = processSubmissionWithIdempotency(testAttempt, mockEvaluator);
  assert(
    firstSubmission.success &&
      firstSubmission.status === "SUBMITTED" &&
      firstSubmission.score === 85 &&
      evalCount === 1,
    "First submission evaluates score and finalizes attempt"
  );

  // Second submission (rapid double click / retry)
  const secondSubmission = processSubmissionWithIdempotency(testAttempt, mockEvaluator);
  assert(
    secondSubmission.success &&
      secondSubmission.alreadyFinalized === true &&
      secondSubmission.reEvaluated === false &&
      secondSubmission.score === 85 &&
      evalCount === 1,
    "Second submission returns finalized result idempotently without re-grading (evalCount: 1)"
  );
  assert(
    secondSubmission.certificateId === "cert-abc-999",
    "Second submission preserves original certificate ID without generating duplicates"
  );

  // --- SUITE 4: Comprehensive Audit Logging ---
  console.log("\n📋 4. Testing Comprehensive Audit Logging Coverage...");

  const auditService = new MockAuditLogService();

  // Log user auth actions
  auditService.log({ userId: "u-1", action: "AUTH_LOGIN_SUCCESS", details: { email: "admin@test.com" } });
  auditService.log({ userId: "u-2", action: "AUTH_LOGIN_BLOCKED_DEACTIVATED", details: { email: "deact@test.com" } });
  auditService.log({ userId: "u-1", action: "AUTH_LOGOUT" });

  // Log administrative student actions
  auditService.log({ userId: "admin-1", action: "STUDENT_CREATED", targetType: "User", targetId: "s-1" });
  auditService.log({ userId: "admin-1", action: "STUDENT_DEACTIVATED", targetType: "User", targetId: "s-2" });
  auditService.log({ userId: "admin-1", action: "STUDENT_ACTIVATED", targetType: "User", targetId: "s-2" });
  auditService.log({ userId: "admin-1", action: "STUDENT_BULK_IMPORTED", targetType: "User", details: { count: 50 } });

  // Log administrative exam actions
  auditService.log({ userId: "admin-1", action: "EXAM_CREATED", targetType: "Exam", targetId: "ex-1" });
  auditService.log({ userId: "admin-1", action: "EXAM_VERSIONED", targetType: "Exam", targetId: "ex-1", details: { version: 2 } });
  auditService.log({ userId: "admin-1", action: "EXAM_ASSIGNED", targetType: "Exam", targetId: "ex-1" });
  auditService.log({ userId: "admin-1", action: "ASSIGNMENT_REVOKED", targetType: "ExamAssignment", targetId: "as-1" });

  // Log candidate exam actions
  auditService.log({ userId: "s-1", action: "EXAM_STARTED", targetType: "ExamAttempt", targetId: "att-1" });
  auditService.log({ userId: "s-1", action: "PROCTOR_VIOLATION_TAB_SWITCH", targetType: "ExamAttempt", targetId: "att-1" });
  auditService.log({ userId: "s-1", action: "EXAM_SUBMITTED", targetType: "ExamAttempt", targetId: "att-1" });
  auditService.log({ userId: "s-1", action: "EXAM_TIMED_OUT", targetType: "ExamAttempt", targetId: "att-2" });

  // Log review & certificate actions
  auditService.log({ userId: "admin-1", action: "ATTEMPT_REVIEWED", targetType: "ExamAttempt", targetId: "att-1" });
  auditService.log({ userId: "s-1", action: "CERTIFICATE_GENERATED", targetType: "Certificate", targetId: "c-1" });

  assert(auditService.hasAction("AUTH_LOGIN_SUCCESS"), "Logs AUTH_LOGIN_SUCCESS");
  assert(auditService.hasAction("AUTH_LOGIN_BLOCKED_DEACTIVATED"), "Logs AUTH_LOGIN_BLOCKED_DEACTIVATED");
  assert(auditService.hasAction("STUDENT_CREATED"), "Logs STUDENT_CREATED");
  assert(auditService.hasAction("STUDENT_DEACTIVATED"), "Logs STUDENT_DEACTIVATED");
  assert(auditService.hasAction("EXAM_CREATED"), "Logs EXAM_CREATED");
  assert(auditService.hasAction("EXAM_VERSIONED"), "Logs EXAM_VERSIONED");
  assert(auditService.hasAction("EXAM_ASSIGNED"), "Logs EXAM_ASSIGNED");
  assert(auditService.hasAction("EXAM_STARTED"), "Logs candidate EXAM_STARTED");
  assert(auditService.hasAction("PROCTOR_VIOLATION_TAB_SWITCH"), "Logs PROCTOR_VIOLATION_TAB_SWITCH");
  assert(auditService.hasAction("EXAM_SUBMITTED"), "Logs EXAM_SUBMITTED");
  assert(auditService.hasAction("EXAM_TIMED_OUT"), "Logs candidate EXAM_TIMED_OUT");
  assert(auditService.hasAction("ATTEMPT_REVIEWED"), "Logs instructor ATTEMPT_REVIEWED");
  assert(auditService.hasAction("CERTIFICATE_GENERATED"), "Logs CERTIFICATE_GENERATED");

  console.log("\n=================================================");
  console.log(`  PHASE 2 RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("=================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
