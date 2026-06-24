"use client";

import { useState, useEffect, useCallback } from "react";

type InviteRequest = {
  id: string;
  tenantId: string;
  tenantName: string;
  driverWhatsapp: string;
  driverName: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  sentAt: string | null;
  expiresAt: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-yellow-700 text-yellow-300",
  approved: "border-blue-700 text-blue-300",
  sent: "border-green-700 text-green-300",
};

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return "expired";
  return `expires ${diff}d`;
}

export function InviteRequestsSection() {
  const [requests, setRequests] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/driver-invite-requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionLoading(id + "-approve");
    setActionError(null);
    const res = await fetch(`/api/admin/driver-invite-requests/${id}/approve`, { method: "PATCH" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Failed to approve");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id + "-reject");
    setActionError(null);
    const res = await fetch(`/api/admin/driver-invite-requests/${id}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Failed to reject");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  if (loading) {
    return <p className="text-sm text-gray-500 mt-2">Loading invite requests…</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-1">Driver Invite Requests</h2>
        <p className="text-sm text-gray-600">No pending invite requests.</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Driver Invite Requests</h2>
        <p className="text-sm text-gray-500 mt-1">
          {requests.filter((r) => r.status === "pending").length} pending · {requests.filter((r) => r.status === "sent").length} sent
        </p>
      </div>

      {actionError && (
        <p className="text-sm text-red-400 mb-4">{actionError}</p>
      )}

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{r.tenantName}</span>
                  <span className={`text-xs border rounded-full px-2 py-0.5 ${STATUS_STYLES[r.status] ?? "border-gray-700 text-gray-400"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-300 font-mono">{r.driverWhatsapp}</span>
                {r.driverName && (
                  <span className="text-xs text-gray-500">{r.driverName} (operator hint)</span>
                )}
                <span className="text-xs text-gray-600">
                  Requested {daysAgo(r.createdAt)}
                  {r.expiresAt && (
                    <span className="ml-2 text-yellow-600">· {daysUntil(r.expiresAt)}</span>
                  )}
                </span>
              </div>

              {r.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={actionLoading !== null}
                    className="text-xs font-semibold px-3 py-1.5 rounded border border-green-700 text-green-300 hover:bg-green-900/30 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === r.id + "-approve" ? "…" : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    disabled={actionLoading !== null}
                    className="text-xs font-semibold px-3 py-1.5 rounded border border-red-800 text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === r.id + "-reject" ? "…" : "✗ Reject"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
