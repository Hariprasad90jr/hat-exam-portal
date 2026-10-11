"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
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
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (action.includes("APPROVED") || action.includes("SUCCESS") || action.includes("CERTIFICATE")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("START") || action.includes("REQUEST")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (action.includes("REVIEW")) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-indigo-400" />
            Security & Audit Activity Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative, append-only security journal recording all authentication, examination, grading, and administrative events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Journal</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, details, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Action:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            <option value="STUDENT_DEACTIVATED">Student Deactivated</option>
            <option value="STUDENT_ACTIVATED">Student Activated</option>
            <option value="PROCTOR_VIOLATION_TAB_SWITCH">Proctor Tab Switch</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">Actor / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500">
                    <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium text-slate-400">No audit events found.</p>
                    <p className="text-xs text-slate-600 mt-1">Audit logs will appear as exams and administration actions occur.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                      {log.targetType ? (
                        <span>
                          {log.targetType}
                          {log.targetId && <span className="text-slate-500 ml-1">#{log.targetId.slice(-6)}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-md break-words">
                      {log.details || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      <div>
                        {log.userId ? (
                          <span className="text-indigo-400">User #{log.userId.slice(-6)}</span>
                        ) : (
                          <span className="text-slate-600">Anonymous / System</span>
                        )}
                      </div>
                      {log.ipAddress && (
                        <span className="text-[10px] text-slate-600 block">{log.ipAddress}</span>
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
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Total records: <span className="text-white font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs">
                Page <span className="text-white font-medium">{page}</span> of{" "}
                <span className="text-white font-medium">{totalPages}</span>
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
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
