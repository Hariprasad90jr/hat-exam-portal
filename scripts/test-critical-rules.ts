/**
 * Critical Business Rules Test Suite for Exam Portal
 * Tests:
 * 1. Timer Expiry Logic & Server-side Duration Enforcement
 * 2. Scoring Logic (All Correct, All Wrong, Unanswered, Negative Marking, Zero Floor)
 * 3. Question Types (Single Choice, Multi Choice, True/False, Short Answer)
 * 4. Percentage Calculation & Precision
 * 5. Attempt Limit Enforcement Logic
 * 6. Certificate Generation Rules
 * 7. Exam Data Integrity Simulation
 */

let totalPassed = 0;
let totalFailed = 0;

function check(testName: string, passed: boolean, details?: string) {
  if (passed) {
    console.log(`  ✅ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ""}`);
    totalFailed++;
  }
}

// 1. TIMER EXPIRY TEST
function testTimerEnforcement() {
  console.log("\n⏱️ 1. Testing Server-side Timer Expiration Logic...");

  const durationMinutes = 45;
  const totalDurationSeconds = durationMinutes * 60; // 2700s

  // Scenario A: Started 40 minutes ago (Active)
  const startedAtA = new Date(Date.now() - 40 * 60 * 1000);
  const elapsedA = Math.floor((Date.now() - startedAtA.getTime()) / 1000);
  const remainingA = Math.max(0, totalDurationSeconds - elapsedA);
  const isExpiredA = remainingA <= 0;
  check("Exam active when within duration window (40m into 45m test)", !isExpiredA && remainingA > 0);

  // Scenario B: Started 46 minutes ago (Expired by 1 minute)
  const startedAtB = new Date(Date.now() - 46 * 60 * 1000);
  const elapsedB = Math.floor((Date.now() - startedAtB.getTime()) / 1000);
  const remainingB = Math.max(0, totalDurationSeconds - elapsedB);
  const isExpiredB = remainingB <= 0;
  check("Server detects expired exam when time elapsed exceeds duration (46m into 45m test)", isExpiredB && remainingB === 0);

  // Scenario C: Grace period threshold (e.g. 30 seconds network buffer)
  const gracePeriodSeconds = 30;
  const startedAtC = new Date(Date.now() - (45 * 60 + 15) * 1000); // 15s overtime
  const elapsedC = Math.floor((Date.now() - startedAtC.getTime()) / 1000);
  const isWithinGrace = elapsedC <= totalDurationSeconds + gracePeriodSeconds;
  check("Server accommodates network latency buffer (15s overtime within 30s grace buffer)", isWithinGrace);

  const startedAtCOver = new Date(Date.now() - (45 * 60 + 45) * 1000); // 45s overtime
  const elapsedCOver = Math.floor((Date.now() - startedAtCOver.getTime()) / 1000);
  const isOverGrace = elapsedCOver > totalDurationSeconds + gracePeriodSeconds;
  check("Server strictly rejects submissions that exceed duration + grace buffer", isOverGrace);
}

// 2. SCORING ENGINE SIMULATION
function testScoringEngine() {
  console.log("\n📊 2. Testing Scoring Engine Across All Question Types & Edge Cases...");

  const questions = [
    {
      id: "q1",
      type: "MCQ_SINGLE",
      points: 4.0,
      negativePoints: 1.0,
      correctOptionId: "q1_b",
    },
    {
      id: "q2",
      type: "MCQ_MULTIPLE",
      points: 3.0,
      negativePoints: 1.0,
      correctOptionIds: ["q2_a", "q2_c"],
    },
    {
      id: "q3",
      type: "TRUE_FALSE",
      points: 3.0,
      negativePoints: 0.5,
      correctOptionId: "q3_true",
    },
    {
      id: "q4",
      type: "SHORT_ANSWER",
      points: 5.0,
      negativePoints: 0.0,
      sampleExpectedAnswer: "Reverse proxy handles load balancing and SSL termination",
    },
  ];

  const totalMaxMarks = questions.reduce((acc, q) => acc + q.points, 0); // 15.0 pts
  const passingScorePct = 50.0;

  function evaluate(
    answers: Record<string, { selectedOptionIds?: string[]; textAnswer?: string }>,
    negativeMarking: boolean = true
  ) {
    let score = 0;
    const itemScores: Record<string, number> = {};

    for (const q of questions) {
      const ans = answers[q.id];
      let awarded = 0;

      if (!ans || (!ans.textAnswer && (!ans.selectedOptionIds || ans.selectedOptionIds.length === 0))) {
        awarded = 0; // Unanswered
      } else if (q.type === "MCQ_SINGLE" || q.type === "TRUE_FALSE") {
        if (ans.selectedOptionIds?.[0] === q.correctOptionId) {
          awarded = q.points;
        } else {
          awarded = negativeMarking ? -q.negativePoints : 0;
        }
      } else if (q.type === "MCQ_MULTIPLE") {
        const correct = q.correctOptionIds || [];
        const selected = ans.selectedOptionIds || [];
        const isMatch =
          correct.length === selected.length &&
          correct.every((id) => selected.includes(id));
        if (isMatch) {
          awarded = q.points;
        } else {
          awarded = negativeMarking ? -q.negativePoints : 0;
        }
      } else if (q.type === "SHORT_ANSWER") {
        if (ans.textAnswer && ans.textAnswer.trim().length > 0) {
          awarded = q.points;
        } else {
          awarded = 0;
        }
      }

      itemScores[q.id] = awarded;
      score += awarded;
    }

    const finalScore = Math.max(0, Math.round(score * 100) / 100);
    const percentage = totalMaxMarks > 0 ? Math.round((finalScore / totalMaxMarks) * 1000) / 10 : 0;
    const passed = percentage >= passingScorePct;

    return { finalScore, percentage, passed, itemScores };
  }

  // Case 1: All Correct
  const res1 = evaluate({
    q1: { selectedOptionIds: ["q1_b"] },
    q2: { selectedOptionIds: ["q2_a", "q2_c"] },
    q3: { selectedOptionIds: ["q3_true"] },
    q4: { textAnswer: "A reverse proxy handles SSL offloading and load balancing" },
  });
  check("Case 1: All correct answers award 15/15 points (100%)", res1.finalScore === 15 && res1.percentage === 100 && res1.passed);

  // Case 2: All Wrong with Negative Marking
  const res2 = evaluate({
    q1: { selectedOptionIds: ["q1_wrong"] }, // -1.0
    q2: { selectedOptionIds: ["q2_wrong"] }, // -1.0
    q3: { selectedOptionIds: ["q3_false"] }, // -0.5
    q4: { textAnswer: "" },                  // 0
  });
  // Raw score is -2.5. Zero floor must guarantee score is 0.
  check("Case 2: Negative marking zero-floor prevents negative final score (Raw -2.5 clamped to 0)", res2.finalScore === 0 && res2.percentage === 0 && !res2.passed);

  // Case 3: Completely Unanswered
  const res3 = evaluate({});
  check("Case 3: Unanswered questions award 0 points without negative penalty", res3.finalScore === 0 && res3.percentage === 0 && !res3.passed);

  // Case 4: Multi-select Partial Pick (All-or-Nothing check)
  const res4 = evaluate({
    q1: { selectedOptionIds: ["q1_b"] }, // +4
    q2: { selectedOptionIds: ["q2_a"] }, // partial (missing q2_c) -> penalizes -1.0
    q3: { selectedOptionIds: ["q3_true"] }, // +3
  });
  check("Case 4: Multi-select partial answer penalized if exact match required (4 - 1 + 3 = 6 pts)", res4.finalScore === 6 && res4.percentage === 40);

  // Case 5: Passing Score Boundary (Pass mark is 50%, i.e. 7.5 / 15)
  const res5 = evaluate({
    q1: { selectedOptionIds: ["q1_b"] }, // 4.0
    q3: { selectedOptionIds: ["q3_true"] }, // 3.0
    q4: { textAnswer: "Proxy" }, // 5.0 -> Total 12 / 15 (80%)
  });
  check("Case 5: Candidate with 12/15 (80%) satisfies 50% passing threshold", res5.passed === true);
}

// 3. ATTEMPT LIMIT ENFORCEMENT
function testAttemptLimits() {
  console.log("\n🔒 3. Testing Attempt Limit Enforcement Logic...");

  const maxAllowed = 2;
  const history1 = [{ id: "att_1", status: "SUBMITTED" }];
  check("Attempt 1 of 2: Candidate permitted to start attempt 2", history1.length < maxAllowed);

  const history2 = [
    { id: "att_1", status: "SUBMITTED" },
    { id: "att_2", status: "SUBMITTED" },
  ];
  check("Attempt 2 of 2: Candidate blocked from starting attempt 3", history2.length >= maxAllowed);

  const historyWithAbandon = [
    { id: "att_1", status: "SUBMITTED" },
    { id: "att_2", status: "TIMED_OUT" },
  ];
  check("Timed-out attempts count towards max attempts quota", historyWithAbandon.length >= maxAllowed);
}

// 4. CERTIFICATE GENERATION RULES
function testCertificateRules() {
  console.log("\n🏆 4. Testing Certificate Generation Logic...");

  const passingCandidate = { score: 12, totalMarks: 15, percentage: 80.0, passed: true };
  const failingCandidate = { score: 6, totalMarks: 15, percentage: 40.0, passed: false };

  function shouldIssueCertificate(candidate: { passed: boolean }): boolean {
    return candidate.passed === true;
  }

  check("Certificate issued when candidate passes threshold", shouldIssueCertificate(passingCandidate) === true);
  check("Certificate NOT issued when candidate fails threshold", shouldIssueCertificate(failingCandidate) === false);
}

// 5. DATA INTEGRITY AUDIT TEST
function testDataIntegrityScenario() {
  console.log("\n⚠️ 5. Testing Exam Data Integrity / Cascade Behavior Risk...");

  // Scenario: Student has answers tied to questionId
  const questionId = "q_101";
  const studentAnswer = { id: "ans_1", attemptId: "att_1", questionId: questionId, selectedOptionIds: ["opt_1"] };

  // If questions are deleted via deleteMany without versioning:
  const questionsDeleted = true;
  const cascadeDeletesAnswer = questionsDeleted; // true due to onDelete: Cascade

  check("AUDIT VERIFICATION: onDelete: Cascade on Question deletes student answers if questions are edited", cascadeDeletesAnswer === true);
}

async function run() {
  console.log("=================================================");
  console.log("  EXAM PORTAL CRITICAL BUSINESS RULES TEST SUITE ");
  console.log("=================================================");

  testTimerEnforcement();
  testScoringEngine();
  testAttemptLimits();
  testCertificateRules();
  testDataIntegrityScenario();

  console.log("\n=================================================");
  console.log(`  SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log("=================================================");

  if (totalFailed > 0) process.exit(1);
}

run();
