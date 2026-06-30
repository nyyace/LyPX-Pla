"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountUser = {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
};

export function PortalAccessSection({
  accountId,
  existingUsers,
}: {
  accountId: string;
  existingUsers: AccountUser[];
}) {
  const [users, setUsers]   = useState<AccountUser[]>(existingUsers);
  const [tab, setTab]       = useState<"link" | "create">("create");

  // Link existing user form
  const [userId, setUserId] = useState("");
  const [role,   setRole]   = useState("member");
  const [linking, setLinking] = useState(false);
  const [linkErr, setLinkErr] = useState<string | null>(null);

  // Create new user form
  const [email,     setEmail]     = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [password,  setPassword]  = useState("");
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createOk,  setCreateOk]  = useState<string | null>(null);

  const inputCls = "w-full px-3 py-1.5 bg-gray-950 border border-gray-700 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600";

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkErr(null);
    setLinking(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setUsers(u => {
        const existing = u.find(x => x.userId === d.userId);
        if (existing) return u.map(x => x.userId === d.userId ? { ...x, role: d.role } : x);
        return [...u, d];
      });
      setUserId("");
    } catch (err: unknown) {
      setLinkErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setLinking(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setCreateOk(null);
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/provision-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), firstName, lastName, password, role: "member" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setCreateOk(`Created: ${d.email} (ID: ${d.workosUserId})`);
      setUsers(u => [...u, d.accountUser]);
      setEmail(""); setFirstName(""); setLastName(""); setPassword("");
    } catch (err: unknown) {
      setCreateErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">Portal Access</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Existing users */}
        {users.length > 0 ? (
          <div className="mb-4 space-y-1">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-xs font-mono text-gray-400 truncate max-w-xs">{u.userId}</span>
                <span className="text-xs text-gray-500 ml-2">{u.role}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 mb-4">No users linked yet</p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
          {(["create", "link"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded ${tab === t ? "bg-yellow-600 text-black font-semibold" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t === "create" ? "Create New User" : "Link Existing ID"}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputCls}
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
            <input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputCls}
            />
            <input
              type="password"
              placeholder="Password (min 8 chars) *"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={inputCls}
            />
            {createErr && <p className="text-xs text-red-400">{createErr}</p>}
            {createOk  && <p className="text-xs text-green-400">{createOk}</p>}
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 bg-yellow-600 text-black text-xs font-semibold rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create & Grant Access"}
            </button>
          </form>
        )}

        {tab === "link" && (
          <form onSubmit={handleLink} className="space-y-3">
            <input
              placeholder="WorkOS User ID (user_…)"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              className={inputCls}
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className={inputCls + " cursor-pointer"}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            {linkErr && <p className="text-xs text-red-400">{linkErr}</p>}
            <button
              type="submit"
              disabled={linking}
              className="px-4 py-1.5 bg-yellow-600 text-black text-xs font-semibold rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {linking ? "Granting…" : "Grant Access"}
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
