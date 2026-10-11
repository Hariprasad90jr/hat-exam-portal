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
  ArrowUpRight, 
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Platform overview, candidate assessments, and test statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Manage Students</span>
          </Link>
          <Link
            href="/admin/exams/create"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* Actionable Alerts (Pending Review or Pending Attempt Requests) */}
      {(pendingReviewsCount > 0 || pendingRequestsCount > 0) && (
        <div className="space-y-3">
          {pendingReviewsCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-amber-300">
                    Subjective Evaluation Pending Review
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {pendingReviewsCount} exam attempt{pendingReviewsCount > 1 ? "s require" : " requires"} instructor evaluation of short-answer questions before final scoring & certificates can be issued.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/attempts"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shrink-0 transition"
              >
                Grade Attempts
              </Link>
            </div>
          )}

          {pendingRequestsCount > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-indigo-300">
                    Additional Attempt Requests Pending
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {pendingRequestsCount} student{pendingRequestsCount > 1 ? "s have" : " has"} requested an additional exam attempt after reaching maximum tries.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/attempt-requests"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shrink-0 transition"
              >
                Review Requests
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published Exams</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{publishedExamsCount}</span>
            <span className="text-xs text-slate-400 ml-2">/ {examsCount} total</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Students</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{studentsCount}</span>
            <span className="text-xs text-slate-400 ml-2">eligible candidates</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Attempts</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{attemptsCount}</span>
            <span className="text-xs text-slate-400 ml-2">({pendingReviewsCount} pending review)</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issued Certificates</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{certificatesCount}</span>
            <span className="text-xs text-slate-400 ml-2">({passRate}% pass rate)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Recent Exams & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Active Exams */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Active Examinations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recently created assessments</p>
            </div>
            <Link
              href="/admin/exams"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentExams.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No exams created yet. Click "Create New Exam" to begin.
              </div>
            ) : (
              recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs truncate">{exam.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          exam.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span>{exam.code}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
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
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition font-medium"
                    >
                      Assign
                    </Link>
                    <Link
                      href={`/admin/exams/${exam.id}/edit`}
                      className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] rounded-lg border border-indigo-500/30 transition font-medium"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Recent Test Submissions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time candidate submissions</p>
            </div>
            <Link
              href="/admin/attempts"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>All results</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAttempts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No exam attempts recorded yet.
              </div>
            ) : (
              recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-white truncate">{attempt.student?.name || "Student"}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{attempt.exam?.title}</p>
                    <span className="text-[10px] text-slate-400">{formatDate(attempt.submittedAt || attempt.createdAt)}</span>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {attempt.score}/{attempt.totalMarks}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {Math.round(attempt.percentage)}%
                      </div>
                    </div>
                    {attempt.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
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
