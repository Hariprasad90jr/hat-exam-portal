"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  Terminal,
  Activity
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(actionFilter !== "ALL" && { action: actionFilter }),
        ...(search && { q: search }),
      });

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("BLOCKED") || action.includes("TIMEOUT") || action.includes("REJECTED")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (action.includes("APPROVED") || action.includes("SUCCESS") || action.includes("CERTIFICATE")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("START") || action.includes("REQUEST")) {
      return "bg-[#FAF7F0] text-[#8C7448] border-[#B59A68]/30";
    }
    if (action.includes("REVIEW")) {
      return "bg-[#E8F3F1] text-[#176B63] border-[#2E857A]/20";
    }
    return "bg-[#E8F3F1] text-[#176B63] border-[#2E857A]/20";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F] flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#176B63]" />
            Security & Audit Activity Journal
          </h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Authoritative, append-only security journal recording all authentication, examination, grading, and administrative events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-[#FAF7F0] text-[#24332F] text-xs font-semibold rounded-xl border border-[#E4E0D6] transition flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#176B63]" />
          <span>Refresh Journal</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9690]" />
          <input
            type="text"
            placeholder="Search action event, target ID, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#66736E]" />
            <span className="text-xs text-[#66736E] font-medium">Event:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
            <option value="AUTH_LOGIN_BLOCKED_DEACTIVATED">Blocked (Deactivated)</option>
            <option value="EXAM_STARTED">Exam Started</option>
            <option value="EXAM_SUBMITTED">Exam Submitted</option>
            <option value="EXAM_TIMED_OUT">Exam Timed Out</option>
            <option value="ATTEMPT_REQUEST_SUBMITTED">Attempt Requested</option>
            <option value="ATTEMPT_REQUEST_APPROVED">Attempt Approved</option>
            <option value="ATTEMPT_REQUEST_REJECTED">Attempt Rejected</option>
            <option value="ATTEMPT_REVIEWED">Attempt Reviewed</option>
            <option value="CERTIFICATE_GENERATED">Certificate Generated</option>
            <option value="CERTIFICATE_TEMPLATE_UPDATED">Template Updated</option>
            <option value="STUDENT_DEACTIVATED">Scholar Deactivated</option>
            <option value="STUDENT_ACTIVATED">Scholar Activated</option>
            <option value="PROCTOR_VIOLATION_TAB_SWITCH">Integrity Tab Switch</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4E0D6] bg-[#FAF7F0] text-[11px] font-semibold uppercase tracking-wider text-[#66736E]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">Actor / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D6]/60 text-xs text-[#24332F]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#66736E]">
                    <Loader2 className="w-7 h-7 animate-spin text-[#176B63] mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#66736E]">
                    <Terminal className="w-10 h-10 mx-auto mb-3 text-[#8A9690] opacity-40" />
                    <p className="text-sm font-semibold text-[#24332F]">No audit events found.</p>
                    <p className="text-xs text-[#66736E] mt-1">Audit logs will appear as exams and administration actions occur.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF7F0]/40 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#66736E] whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#24332F] whitespace-nowrap">
                      {log.targetType ? (
                        <span>
                          {log.targetType}
                          {log.targetId && <span className="text-[#8C7448] ml-1">#{log.targetId.slice(-6)}</span>}
                        </span>
                      ) : (
                        <span className="text-[#8A9690]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#24332F] max-w-md break-words">
                      {log.details || <span className="text-[#8A9690]">—</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#66736E] whitespace-nowrap">
                      <div>
                        {log.userId ? (
                          <span className="text-[#176B63] font-semibold">User #{log.userId.slice(-6)}</span>
                        ) : (
                          <span className="text-[#8A9690]">Anonymous / System</span>
                        )}
                      </div>
                      {log.ipAddress && (
                        <span className="text-[10px] text-[#8A9690] block">{log.ipAddress}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="p-4 border-t border-[#E4E0D6] bg-[#FAF7F0] flex items-center justify-between text-xs text-[#66736E]">
            <div>
              Total records: <span className="text-[#24332F] font-bold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-[#E4E0D6] bg-white hover:bg-[#FAF7F0] disabled:opacity-30 disabled:cursor-not-allowed text-[#24332F]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs">
                Page <span className="text-[#24332F] font-bold">{page}</span> of{" "}
                <span className="text-[#24332F] font-bold">{totalPages}</span>
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-[#E4E0D6] bg-white hover:bg-[#FAF7F0] disabled:opacity-30 disabled:cursor-not-allowed text-[#24332F]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
