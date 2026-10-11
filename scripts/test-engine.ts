import { hashPassword, comparePassword, signToken, verifyToken } from "../src/lib/auth";
import { formatSecondsToTime, formatDate } from "../src/lib/utils";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runAuthTests() {
  console.log("\n🧪 Running Authentication & Token Tests...");

  // 1. Password Hashing & Verification
  const rawPass = "superSecurePass123!";
  const hash = await hashPassword(rawPass);
  assert(hash !== rawPass, "Password is encrypted into non-plain hash");
  assert(await comparePassword(rawPass, hash), "Correct password matches hash");
  assert(!(await comparePassword("wrongPass", hash)), "Wrong password fails verification");

  // 2. JWT Sign & Verify
  const userPayload = {
    id: "user_test_123",
    email: "student@test.com",
    name: "Test Student",
    role: "STUDENT" as any,
  };
  const token = await signToken(userPayload);
  assert(typeof token === "string" && token.length > 20, "JWT token generated");

  const verified = await verifyToken(token);
  assert(verified !== null, "JWT token verified successfully");
  assert(verified?.id === userPayload.id, "Token payload user ID matches");
  assert(verified?.role === "STUDENT", "Token payload user role matches");
}

function runScoringLogicTests() {
  console.log("\n🧪 Running Scoring Engine & Evaluation Tests...");

  // Mock Question 1: Single MCQ (4 pts, -1 pt negative)
  const q1 = {
    id: "q1",
    points: 4,
    negativePoints: 1,
    correctOptionId: "opt_b",
  };

  // Mock Question 2: Multi-select MCQ (3 pts, -0.5 pt negative)
  const q2 = {
    id: "q2",
    points: 3,
    negativePoints: 0.5,
    correctOptionIds: ["opt_1", "opt_3"],
  };

  // Evaluation Function (same logic as in /api/student/exams/[id]/submit)
  function evaluateAnswers(answers: { q1: string; q2: string[] }, negativeMarking: boolean) {
    let score = 0;

    // Q1 Single MCQ
    if (answers.q1 === q1.correctOptionId) {
      score += q1.points;
    } else if (answers.q1) {
      score += negativeMarking ? -q1.negativePoints : 0;
    }

    // Q2 Multi MCQ
    const q2Exact =
      answers.q2.length === q2.correctOptionIds.length &&
      answers.q2.every((id) => q2.correctOptionIds.includes(id));

    if (q2Exact) {
      score += q2.points;
    } else if (answers.q2.length > 0) {
      score += negativeMarking ? -q2.negativePoints : 0;
    }

    return Math.max(0, score);
  }

  // Test Case 1: Both Correct
  const scoreBothCorrect = evaluateAnswers({ q1: "opt_b", q2: ["opt_1", "opt_3"] }, true);
  assert(scoreBothCorrect === 7, "Both correct yields full points (7 pts)");

  // Test Case 2: One Correct, One Incorrect (With negative marking)
  const scoreOneWrong = evaluateAnswers({ q1: "opt_b", q2: ["opt_1"] }, true);
  assert(scoreOneWrong === 3.5, "Negative marking correctly penalizes partial/incorrect answer (4 - 0.5 = 3.5 pts)");

  // Test Case 3: Both Incorrect (Scores floor at 0)
  const scoreBothWrong = evaluateAnswers({ q1: "opt_a", q2: ["opt_4"] }, true);
  assert(scoreBothWrong === 0, "Negative marking cannot decrease total exam score below 0 floor");

  // Test Case 4: Passing Threshold (Passing percentage is 50%)
  const totalMax = 7;
  const passingScorePct = 50.0;
  const pct1 = (scoreBothCorrect / totalMax) * 100;
  const pct2 = (scoreOneWrong / totalMax) * 100;

  assert(pct1 >= passingScorePct, "100% score qualifies for passing and certificate");
  assert(pct2 === 50, "3.5/7 equals exactly 50% and passes cutoff threshold");
}

function runUtilityFormattingTests() {
  console.log("\n🧪 Running Formatting & Timer Utility Tests...");

  assert(formatSecondsToTime(3600) === "60:00", "3600 seconds formats to 60:00");
  assert(formatSecondsToTime(125) === "02:05", "125 seconds formats to 02:05");
  assert(formatSecondsToTime(9) === "00:09", "9 seconds formats to 00:09");
  assert(formatSecondsToTime(0) === "00:00", "0 seconds formats to 00:00");
}

async function main() {
  console.log("========================================");
  console.log("  EXAM PORTAL AUTOMATED TEST SUITE      ");
  console.log("========================================");

  await runAuthTests();
  runScoringLogicTests();
  runUtilityFormattingTests();

  console.log("\n========================================");
  console.log(`  RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("========================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
