"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AttemptRequestItem {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string | null;
    department: string | null;
  };
  exam: {
    id: string;
    title: string;
    code: string;
  };
  assignment: {
    id: string;
    maxAttempts: number;
    status: string;
  } | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  requestedAt: string;
}

export default function AdminAttemptRequestsPage() {
  const [requests, setRequests] = useState<AttemptRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Review Action Modal
  const [selectedRequest, setSelectedRequest] = useState<AttemptRequestItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [additionalAttempts, setAdditionalAttempts] = useState(1);
  const [adminComment, setAdminComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/attempt-requests?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to load attempt requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page]);

  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;
    setActionError(null);
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/attempt-requests/${selectedRequest.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          additionalAttempts: actionType === "APPROVE" ? additionalAttempts : 0,
          adminComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedRequest(null);
        setAdminComment("");
        fetchRequests();
      } else {
        setActionError(data.error || "Failed to process review.");
      }
    } catch (err) {
      setActionError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Additional Attempt Requests</h1>
        <p className="text-xs text-slate-400 mt-1">Review, approve, or reject candidate requests for supplementary examination attempts</p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search candidate, exam, or reason..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Candidate</th>
                <th className="px-5 py-3.5 font-semibold">Exam Title</th>
                <th className="px-5 py-3.5 font-semibold">Reason</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold">Requested At</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading attempt requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No attempt requests found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{req.student?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {req.student?.studentId || req.student?.email}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-200">{req.exam?.title}</div>
                      <span className="font-mono text-[10px] text-indigo-400">{req.exam?.code}</span>
                    </td>

                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-300 italic">{req.reason}</p>
                      {req.adminComment && (
                        <p className="text-[10px] text-amber-400 mt-1">Admin note: {req.adminComment}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {formatDate(req.requestedAt)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType("APPROVE");
                              setAdditionalAttempts(1);
                              setAdminComment("");
                              setActionError(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType("REJECT");
                              setAdminComment("");
                              setActionError(null);
                            }}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {requests.length} of {totalCount} requests
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-white">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {actionType === "APPROVE" ? "Approve Attempt Request" : "Reject Attempt Request"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Candidate: <strong className="text-white">{selectedRequest.student.name}</strong> • Exam: {selectedRequest.exam.title}
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Student's Reason:</span>
              <p className="text-xs text-slate-200 italic">{selectedRequest.reason}</p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {actionError}
              </div>
            )}

            {actionType === "APPROVE" && (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Additional Attempts to Grant:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={additionalAttempts}
                  onChange={(e) => setAdditionalAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Admin Comment / Decision Note (Optional):
              </label>
              <textarea
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="e.g. Approved due to verified network outage logs."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleReviewSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg ${
                  actionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                } disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm {actionType === "APPROVE" ? "Approval" : "Rejection"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
