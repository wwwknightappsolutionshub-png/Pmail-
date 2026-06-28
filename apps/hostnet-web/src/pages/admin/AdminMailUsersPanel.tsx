import { Fragment, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { AdminMailUserRecord, AdminMailUserSession, TenantAdmin } from "../../types/site";
import { AdminPageHeader } from "./AdminPageHeader";
import "./AdminDashboard.css";

type Props = {
  tenants: TenantAdmin[];
  pollKey?: string;
  onError: (msg: string) => void;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className={`admin-presence-dot${online ? " online" : ""}`} aria-hidden="true" />
  );
}

export function AdminMailUsersPanel({ tenants, pollKey, onError }: Props) {
  const [users, setUsers] = useState<AdminMailUserRecord[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<AdminMailUserRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<AdminMailUserSession[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.adminMailUserPresence>>["stats"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userSessions, setUserSessions] = useState<AdminMailUserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, onlineRes, sessionsRes, presenceRes] = await Promise.all([
        api.adminMailUsers({ q: q.trim() || undefined, tenantId: tenantId || undefined, onlineOnly, page, limit: 50 }),
        api.adminMailUsersOnline(),
        api.adminActiveMailUserSessions({ limit: 100 }),
        api.adminMailUserPresence(),
      ]);
      setUsers(listRes.users);
      setPagination(listRes.pagination);
      setOnlineUsers(onlineRes.users);
      setActiveSessions(sessionsRes.sessions);
      setStats(presenceRes.stats);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load PMail+ users");
    } finally {
      setLoading(false);
    }
  }, [q, tenantId, onlineOnly, page, onError]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, pollKey]);

  async function toggleSessions(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserSessions([]);
      return;
    }
    setExpandedUserId(userId);
    setSessionsLoading(true);
    try {
      const res = await api.adminMailUserSessions(userId);
      setUserSessions(res.sessions);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load sessions");
      setExpandedUserId(null);
    } finally {
      setSessionsLoading(false);
    }
  }

  return (
    <div className="admin-mail-users-panel">
      <AdminPageHeader
        title="PMail+ users"
        description="Global mailbox users across all tenants — live presence, last login, and active sessions."
      />

      {stats ? (
        <div className="admin-stat-grid">
          <div className="admin-stat-card highlight">
            <span className="admin-stat-label">Online now</span>
            <strong className="admin-stat-value">{stats.onlineNow}</strong>
            <span className="muted admin-stat-sub">Active in last {stats.onlineWindowMinutes} min</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total users</span>
            <strong className="admin-stat-value">{stats.totalUsers}</strong>
            <span className="muted admin-stat-sub">{stats.activeUsers} active accounts</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Active sessions</span>
            <strong className="admin-stat-value">{stats.activeSessions}</strong>
            <span className="muted admin-stat-sub">Updated {formatWhen(stats.asOf)}</span>
          </div>
        </div>
      ) : null}

      <section className="card editor-card">
        <div className="admin-mail-users-section-head">
          <h3>Online now</h3>
          <span className="muted">{onlineUsers.length} user(s)</span>
        </div>
        {onlineUsers.length === 0 ? (
          <p className="muted">No PMail+ users are online right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>User</th>
                  <th>Tenant</th>
                  <th>Last active</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {onlineUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-presence-label online">
                        <PresenceDot online /> Online
                      </span>
                    </td>
                    <td>
                      <strong>{user.displayName ?? user.email}</strong>
                      <div className="muted">{user.email}</div>
                    </td>
                    <td>
                      {user.tenant.name}
                      <div className="muted">{user.tenant.slug}</div>
                    </td>
                    <td>{formatWhen(user.presence.lastActiveAt)}</td>
                    <td>{user.presence.activeSessionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card editor-card">
        <div className="admin-mail-users-section-head">
          <h3>Active sessions</h3>
          <span className="muted">{activeSessions.length} session(s)</span>
        </div>
        {activeSessions.length === 0 ? (
          <p className="muted">No active PMail+ sessions.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>User ID</th>
                  <th>Last active</th>
                  <th>Expires</th>
                  <th>IP</th>
                  <th>User agent</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <span className={`admin-presence-label${session.isOnline ? " online" : ""}`}>
                        <PresenceDot online={session.isOnline} />
                        {session.isOnline ? "Online" : "Idle"}
                      </span>
                    </td>
                    <td>
                      <code>{session.userId.slice(0, 8)}…</code>
                    </td>
                    <td>{formatWhen(session.lastActiveAt)}</td>
                    <td>{formatWhen(session.expiresAt)}</td>
                    <td>{session.ipAddress ?? "—"}</td>
                    <td className="admin-session-agent">{session.userAgent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card editor-card">
        <div className="admin-mail-users-toolbar">
          <label>
            Search
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Email, name, or tenant"
            />
          </label>
          <label>
            Tenant
            <select
              value={tenantId}
              onChange={(e) => {
                setPage(1);
                setTenantId(e.target.value);
              }}
            >
              <option value="">All tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => {
                setPage(1);
                setOnlineOnly(e.target.checked);
              }}
            />
            Online only
          </label>
        </div>

        {loading ? (
          <p className="muted">Loading users…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Tenant</th>
                    <th>Last login</th>
                    <th>Last active</th>
                    <th>Sessions</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <Fragment key={user.id}>
                      <tr>
                        <td>
                          <span className={`admin-presence-label${user.presence.isOnline ? " online" : ""}`}>
                            <PresenceDot online={user.presence.isOnline} />
                            {user.presence.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.displayName ?? "—"}</td>
                        <td>
                          {user.tenant.name}
                          <div className="muted">{user.tenant.slug}</div>
                        </td>
                        <td>{formatWhen(user.lastLoginAt)}</td>
                        <td>{formatWhen(user.presence.lastActiveAt)}</td>
                        <td>{user.presence.activeSessionCount}</td>
                        <td>{user.isActive ? "Yes" : "No"}</td>
                        <td>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSessions(user.id)}>
                            {expandedUserId === user.id ? "Hide" : "Sessions"}
                          </button>
                        </td>
                      </tr>
                      {expandedUserId === user.id ? (
                        <tr key={`${user.id}-sessions`} className="admin-mail-user-sessions-row">
                          <td colSpan={9}>
                            {sessionsLoading ? (
                              <p className="muted">Loading sessions…</p>
                            ) : userSessions.length === 0 ? (
                              <p className="muted">No active sessions for this user.</p>
                            ) : (
                              <div className="table-wrap">
                                <table className="data-table compact">
                                  <thead>
                                    <tr>
                                      <th>Status</th>
                                      <th>Started</th>
                                      <th>Last active</th>
                                      <th>Expires</th>
                                      <th>IP</th>
                                      <th>User agent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {userSessions.map((session) => (
                                      <tr key={session.id}>
                                        <td>
                                          <span className={`admin-presence-label${session.isOnline ? " online" : ""}`}>
                                            <PresenceDot online={session.isOnline} />
                                            {session.isOnline ? "Online" : "Idle"}
                                          </span>
                                        </td>
                                        <td>{formatWhen(session.createdAt)}</td>
                                        <td>{formatWhen(session.lastActiveAt)}</td>
                                        <td>{formatWhen(session.expiresAt)}</td>
                                        <td>{session.ipAddress ?? "—"}</td>
                                        <td className="admin-session-agent">{session.userAgent ?? "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
