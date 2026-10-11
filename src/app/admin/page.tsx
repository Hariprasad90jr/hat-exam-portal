import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { 
  BookOpen, 
  Users, 
  FileCheck2, 
  Award, 
  PlusCircle, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight
} from "lucide-react";

export default async function AdminDashboardPage() {
  let examsCount = 0;
  let publishedExamsCount = 0;
  let studentsCount = 0;
  let attemptsCount = 0;
  let passedAttemptsCount = 0;
  let pendingReviewsCount = 0;
  let pendingRequestsCount = 0;
  let certificatesCount = 0;
  let recentAttempts: any[] = [];
  let recentExams: any[] = [];

  try {
    const [
      totalExams,
      publishedExams,
      totalStudents,
      totalAttempts,
      passedAttempts,
      pendingReviews,
      pendingRequests,
      totalCertificates,
      attemptsList,
      examsList,
    ] = await Promise.all([
      prisma.exam.count(),
      prisma.exam.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
      prisma.examAttempt.count(),
      prisma.examAttempt.count({ where: { passed: true } }),
      prisma.examAttempt.count({ where: { reviewStatus: "PENDING_REVIEW" } }),
      prisma.attemptRequest.count({ where: { status: "PENDING" } }),
      prisma.certificate.count(),
      prisma.examAttempt.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          student: true,
          exam: true,
        },
      }),
      prisma.exam.findMany({
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { questions: true, attempts: true, assignments: true },
          },
        },
      }),
    ]);

    examsCount = totalExams;
    publishedExamsCount = publishedExams;
    studentsCount = totalStudents;
    attemptsCount = totalAttempts;
    passedAttemptsCount = passedAttempts;
    pendingReviewsCount = pendingReviews;
    pendingRequestsCount = pendingRequests;
    certificatesCount = totalCertificates;
    recentAttempts = attemptsList;
    recentExams = examsList;
  } catch (error) {
    console.error("Dashboard database fetch error:", error);
  }

  const passRate = attemptsCount > 0 ? Math.round((passedAttemptsCount / attemptsCount) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">Curriculum & Assessment Console</h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Institutional overview, student cohorts, examinations, and certification telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F9F6EE] border border-[#E4E0D6] text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-[#176B63]" />
            <span>Manage Scholars</span>
          </Link>
          <Link
            href="/admin/exams/create"
            className="px-4 py-2 rounded-xl bg-[#176B63] hover:bg-[#12554E] text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#B59A68]" />
            <span>Author Examination</span>
          </Link>
        </div>
      </div>

      {/* Actionable Alerts (Pending Review or Pending Attempt Requests) */}
      {(pendingReviewsCount > 0 || pendingRequestsCount > 0) && (
        <div className="space-y-3">
          {pendingReviewsCount > 0 && (
            <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FDE68A] text-[#92400E] flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#92400E]">
                    Subjective Evaluation Pending Review
                  </h3>
                  <p className="text-[11px] text-[#78350F]">
                    {pendingReviewsCount} exam attempt{pendingReviewsCount > 1 ? "s require" : " requires"} instructor evaluation of short-answer questions before final scoring & certificates can be issued.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/attempts"
                className="px-3 py-1.5 bg-[#92400E] hover:bg-[#78350F] text-white font-bold text-xs rounded-lg shrink-0 transition"
              >
                Grade Attempts
              </Link>
            </div>
          )}

          {pendingRequestsCount > 0 && (
            <div className="p-4 rounded-xl bg-[#E8F3F1] border border-[#2E857A]/30 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#176B63] text-white flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#B59A68]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#176B63]">
                    Additional Attempt Requests Pending
                  </h3>
                  <p className="text-[11px] text-[#24332F]">
                    {pendingRequestsCount} scholar{pendingRequestsCount > 1 ? "s have" : " has"} requested an additional exam attempt after reaching maximum tries.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/attempt-requests"
                className="px-3 py-1.5 bg-[#176B63] hover:bg-[#12554E] text-white font-semibold text-xs rounded-lg shrink-0 transition"
              >
                Review Requests
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#E4E0D6] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66736E]">Published Exams</span>
            <div className="w-9 h-9 rounded-xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#24332F]">{publishedExamsCount}</span>
            <span className="text-xs text-[#66736E] ml-2 font-medium">/ {examsCount} total</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E0D6] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66736E]">Active Scholars</span>
            <div className="w-9 h-9 rounded-xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#24332F]">{studentsCount}</span>
            <span className="text-xs text-[#66736E] ml-2 font-medium">enrolled</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E0D6] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66736E]">Exam Attempts</span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F0] text-[#8C7448] flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#24332F]">{attemptsCount}</span>
            <span className="text-xs text-[#66736E] ml-2 font-medium">({pendingReviewsCount} pending review)</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E0D6] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66736E]">Issued Certificates</span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F0] text-[#8C7448] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#24332F]">{certificatesCount}</span>
            <span className="text-xs text-[#66736E] ml-2 font-medium">({passRate}% pass rate)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Recent Exams & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Active Exams */}
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E4E0D6]">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#24332F]">Curriculum Assessments</h2>
              <p className="text-xs text-[#66736E] mt-0.5">Recently created examination modules</p>
            </div>
            <Link
              href="/admin/exams"
              className="text-xs text-[#176B63] hover:text-[#12554E] font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentExams.length === 0 ? (
              <div className="text-center py-8 text-[#66736E] text-xs">
                No examinations created yet. Click "Author Examination" to begin.
              </div>
            ) : (
              recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-xl bg-[#FAF7F0]/40 border border-[#E4E0D6] hover:border-[#B59A68]/60 transition flex items-center justify-between"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-[#24332F] text-sm truncate">{exam.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          exam.status === "PUBLISHED"
                            ? "bg-[#E8F3F1] text-[#176B63] border border-[#2E857A]/20"
                            : "bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#66736E]">
                      <span className="font-mono text-[#8C7448] font-medium">{exam.code}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8A9690]" />
                        {exam.durationMinutes} mins
                      </span>
                      <span>•</span>
                      <span>{exam._count?.questions || 0} questions</span>
                      <span>•</span>
                      <span>{exam._count?.attempts || 0} attempts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/exams/${exam.id}/assign`}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#F9F6EE] text-[#24332F] text-[11px] rounded-lg border border-[#E4E0D6] transition font-medium shadow-sm"
                    >
                      Assign
                    </Link>
                    <Link
                      href={`/admin/exams/${exam.id}/edit`}
                      className="px-2.5 py-1.5 bg-[#E8F3F1] hover:bg-[#D5EAE6] text-[#176B63] text-[11px] rounded-lg border border-[#2E857A]/20 transition font-semibold"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Attempts */}
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E4E0D6]">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#24332F]">Recent Scholar Submissions</h2>
              <p className="text-xs text-[#66736E] mt-0.5">Real-time examination submissions</p>
            </div>
            <Link
              href="/admin/attempts"
              className="text-xs text-[#176B63] hover:text-[#12554E] font-semibold flex items-center gap-1"
            >
              <span>All results</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAttempts.length === 0 ? (
              <div className="text-center py-8 text-[#66736E] text-xs">
                No exam attempts recorded yet.
              </div>
            ) : (
              recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-3.5 rounded-xl bg-[#FAF7F0]/40 border border-[#E4E0D6] flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-[#24332F] truncate">{attempt.student?.name || "Scholar"}</p>
                    <p className="text-[11px] text-[#66736E] truncate mt-0.5">{attempt.exam?.title}</p>
                    <span className="text-[10px] text-[#8A9690]">{formatDate(attempt.submittedAt || attempt.createdAt)}</span>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#24332F]">
                        {attempt.score}/{attempt.totalMarks}
                      </div>
                      <div className="text-[11px] text-[#66736E] font-medium">
                        {Math.round(attempt.percentage)}%
                      </div>
                    </div>
                    {attempt.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                        <XCircle className="w-3 h-3" />
                        Fail
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
