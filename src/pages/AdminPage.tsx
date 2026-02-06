import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { backend } from "../services/backend";

export default function AdminPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ email: string; role: "admin" | "user" } | null>(null);
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; email: string; role: string; tenant_name: string | null; created_at: string }>>([]);
  const [mailboxes, setMailboxes] = useState<Array<{ id: string; email: string; tenant_name: string; created_at: string }>>([]);
  const [shareLinks, setShareLinks] = useState<Array<{ token: string; mailbox_email: string; tenant_name: string; max_queries: number; queries_used: number; expires_at: string }>>([]);

  const [shareMailboxId, setShareMailboxId] = useState("");
  const [shareMaxQueries, setShareMaxQueries] = useState(50);
  const [shareExpiresMinutes, setShareExpiresMinutes] = useState(60);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTenant, setNewTenant] = useState("");

  async function loadAll() {
    setStatus("");
    try {
      const u = await backend.me();
      if (u.role !== "admin") {
        navigate("/dashboard", { replace: true });
        return;
      }
      setMe({ email: u.email, role: u.role });
      const userRes = await backend.adminListUsers();
      setUsers(userRes.users);
      const mailboxRes = await backend.adminListMailboxes();
      setMailboxes(mailboxRes.mailboxes);
      const shareRes = await backend.adminListShareLinks();
      setShareLinks(shareRes.shareLinks);
      if (!shareMailboxId && mailboxRes.mailboxes[0]) setShareMailboxId(mailboxRes.mailboxes[0].id);
    } catch {
      navigate("/login", { replace: true });
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createUser() {
    setStatus("");
    try {
      if (!newEmail || !newPassword) {
        setStatus("错误: 请填写邮箱和密码");
        return;
      }
      await backend.adminCreateUser(newEmail, newPassword, newTenant || newEmail);
      setNewEmail("");
      setNewPassword("");
      setNewTenant("");
      await loadAll();
      setStatus("创建成功");
    } catch (e: any) {
      setStatus(`错误: ${e?.message ?? e}`);
    }
  }

  async function logout() {
    await backend.logout();
    navigate("/login", { replace: true });
  }

  async function createShareLink() {
    setStatus("");
    try {
      if (!shareMailboxId) {
        setStatus("错误: 请选择邮箱");
        return;
      }
      await backend.adminCreateShareLink(shareMailboxId, shareMaxQueries, shareExpiresMinutes);
      await loadAll();
      setStatus("生成成功");
    } catch (e: any) {
      setStatus(`错误: ${e?.message ?? e}`);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>管理员</h1>
        <div className="auth-settings">
          <span>{me ? me.email : ""}</span>
          <Link to="/" className="secondary-btn" style={{ padding: "0.4rem 0.8rem", textDecoration: "none" }}>
            工具
          </Link>
          <button className="secondary-btn" style={{ padding: "0.4rem 0.8rem" }} onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <main className="main-content">
        {status && <div className={`status-msg ${status.includes("错误") ? "error" : "success"}`}>{status}</div>}

        <div className="card fade-in" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <h2>注册账号</h2>
            <p className="subtitle">管理员创建新的登录账户（自动建立独立数据空间）</p>
          </div>

          <div className="bulk-actions">
            <div className="input-group">
              <label>邮箱:</label>
              <input
                className="bulk-input"
                style={{ width: "320px" }}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="input-group">
              <label>密码:</label>
              <input
                className="bulk-input"
                type="password"
                style={{ width: "320px" }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="设置登录密码"
              />
            </div>
            <div className="input-group">
              <label>名称:</label>
              <input
                className="bulk-input"
                style={{ width: "320px" }}
                value={newTenant}
                onChange={(e) => setNewTenant(e.target.value)}
                placeholder="租户名称（可选）"
              />
              <button className="primary-btn" onClick={createUser}>
                创建
              </button>
            </div>
          </div>
        </div>

        <div className="card fade-in" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <h2>账号列表</h2>
            <p className="subtitle">管理员可查看所有账户</p>
          </div>
          <div className="email-list">
            {users.length === 0 ? (
              <div className="empty-state">暂无账号</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="email-item">
                  <div className="email-row">
                    <span className="label">邮箱:</span>
                    <span className="value">{u.email}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">角色:</span>
                    <span className="value">{u.role}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">租户:</span>
                    <span className="value">{u.tenant_name ?? "-"}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">创建:</span>
                    <span className="value">{new Date(u.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card fade-in">
          <div className="card-header">
            <h2>邮箱总览</h2>
            <p className="subtitle">管理员可查询所有邮箱</p>
          </div>
          <div className="email-list">
            {mailboxes.length === 0 ? (
              <div className="empty-state">暂无邮箱</div>
            ) : (
              mailboxes.map((m) => (
                <div key={m.id} className="email-item">
                  <div className="email-row">
                    <span className="label">邮箱:</span>
                    <span className="value">{m.email}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">租户:</span>
                    <span className="value">{m.tenant_name}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">创建:</span>
                    <span className="value">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card fade-in" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">
            <h2>生成游客链接</h2>
            <p className="subtitle">可指定次数与有效时间</p>
          </div>

          <div className="bulk-actions">
            <div className="input-group">
              <label>邮箱:</label>
              <select
                className="bulk-input"
                style={{ width: "420px" }}
                value={shareMailboxId}
                onChange={(e) => setShareMailboxId(e.target.value)}
              >
                <option value="">请选择</option>
                {mailboxes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tenant_name} / {m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>次数:</label>
              <input
                type="number"
                className="bulk-input"
                style={{ width: "120px" }}
                value={shareMaxQueries}
                min={1}
                onChange={(e) => setShareMaxQueries(parseInt(e.target.value) || 1)}
              />
              <label>分钟:</label>
              <input
                type="number"
                className="bulk-input"
                style={{ width: "120px" }}
                value={shareExpiresMinutes}
                min={1}
                onChange={(e) => setShareExpiresMinutes(parseInt(e.target.value) || 1)}
              />
              <button className="primary-btn" onClick={createShareLink}>
                生成
              </button>
            </div>
          </div>

          <div className="email-list">
            {shareLinks.length === 0 ? (
              <div className="empty-state">暂无链接</div>
            ) : (
              shareLinks.map((s) => {
                const url = `${window.location.origin}/s/${s.token}`;
                return (
                  <div key={s.token} className="email-item">
                    <div className="email-row">
                      <span className="label">租户:</span>
                      <span className="value">{s.tenant_name}</span>
                    </div>
                    <div className="email-row">
                      <span className="label">邮箱:</span>
                      <span className="value">{s.mailbox_email}</span>
                    </div>
                    <div className="email-row">
                      <span className="label">用量:</span>
                      <span className="value">{s.queries_used}/{s.max_queries}</span>
                    </div>
                    <div className="email-row">
                      <span className="label">过期:</span>
                      <span className="value">{new Date(s.expires_at).toLocaleString()}</span>
                    </div>
                    <div className="email-row">
                      <span className="label">链接:</span>
                      <span className="value">{url}</span>
                    </div>
                    <div className="action-buttons">
                      <button className="secondary-btn" onClick={() => navigator.clipboard.writeText(url)}>
                        复制链接
                      </button>
                      <Link to={`/s/${s.token}`} className="secondary-btn" style={{ textDecoration: "none" }}>
                        打开
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
