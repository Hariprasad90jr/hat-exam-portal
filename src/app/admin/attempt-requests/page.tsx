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
      if (!res.ok) throw new Error(data.error || "Review submission failed");

      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error processing request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">Additional Attempt Requests</h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Review and adjudicate scholar requests for additional examination attempts
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scholar or exam title..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E4E0D6] text-xs text-[#24332F] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#66736E] border-b border-[#E4E0D6]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Scholar</th>
                <th className="px-5 py-3.5 font-semibold">Curriculum Exam</th>
                <th className="px-5 py-3.5 font-semibold">Stated Reason</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold">Requested At</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D6]/60 text-[#24332F]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#66736E]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
                    Loading attempt requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#66736E]">
                    No attempt requests found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#FAF7F0]/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#24332F]">{req.student?.name}</div>
                      <div className="text-[11px] text-[#66736E] font-mono">
                        {req.student?.studentId || req.student?.email}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#24332F]">{req.exam?.title}</div>
                      <span className="font-mono text-[10px] text-[#8C7448] font-semibold">{req.exam?.code}</span>
                    </td>

                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-[#24332F] italic">{req.reason}</p>
                      {req.adminComment && (
                        <p className="text-[10px] text-[#8C7448] mt-1 font-medium">Instructor note: {req.adminComment}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px] font-semibold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-[#66736E] text-[11px]">
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
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
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
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#8A9690] text-[11px] italic">Processed</span>
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
          <div className="p-4 border-t border-[#E4E0D6] bg-[#FAF7F0] flex items-center justify-between text-xs text-[#66736E]">
            <span>
              Showing {requests.length} of {totalCount} requests
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E4E0D6] bg-white hover:bg-[#FAF7F0] disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[#24332F] font-bold">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E4E0D6] bg-white hover:bg-[#FAF7F0] disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E0D6] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#24332F]">
                {actionType === "APPROVE" ? "Grant Additional Attempt" : "Decline Attempt Request"}
              </h3>
              <p className="text-xs text-[#66736E] mt-0.5 font-sans">
                Scholar: <strong className="text-[#24332F]">{selectedRequest.student.name}</strong> • Exam: {selectedRequest.exam.title}
              </p>
            </div>

            <div className="p-3 bg-[#FAF7F0]/60 border border-[#E4E0D6] rounded-xl">
              <span className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">Scholar&apos;s Reason:</span>
              <p className="text-xs text-[#24332F] italic">{selectedRequest.reason}</p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {actionError}
              </div>
            )}

            {actionType === "APPROVE" && (
              <div>
                <label className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">
                  Additional Attempts to Grant:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={additionalAttempts}
                  onChange={(e) => setAdditionalAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-[#E4E0D6] rounded-xl px-3 py-1.5 text-xs text-[#24332F] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">
                Instructor Comment / Decision Note (Optional):
              </label>
              <textarea
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="e.g. Approved due to verified connectivity interruption during previous attempt."
                className="w-full bg-white border border-[#E4E0D6] rounded-xl p-3 text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#66736E] hover:text-[#24332F] hover:bg-[#FAF7F0] transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleReviewSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm ${
                  actionType === "APPROVE"
                    ? "bg-[#176B63] hover:bg-[#12554E]"
                    : "bg-rose-700 hover:bg-rose-800"
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
