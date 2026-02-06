import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { backend } from "../services/backend";

type Mailbox = { id: string; email: string; created_at: string };

function randomLocalPart(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ email: string; role: "admin" | "user" } | null>(null);
  const [status, setStatus] = useState("");
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [domainInput, setDomainInput] = useState("dynmsl.com");
  const [shareLinks, setShareLinks] = useState<Array<{ token: string; mailbox_email: string; max_queries: number; queries_used: number; expires_at: string }>>([]);
  const [shareMailboxId, setShareMailboxId] = useState("");
  const [shareMaxQueries, setShareMaxQueries] = useState(20);
  const [shareExpiresMinutes, setShareExpiresMinutes] = useState(60);
  const shareBaseUrl = useMemo(() => `${window.location.origin}/s/`, []);

  async function loadAll() {
    setStatus("");
    try {
      const user = await backend.me();
      setMe({ email: user.email, role: user.role });
      const mailboxRes = await backend.tenantListMailboxes();
      setMailboxes(mailboxRes.mailboxes);
      const shareRes = await backend.tenantListShareLinks();
      setShareLinks(shareRes.shareLinks);
      if (!shareMailboxId && mailboxRes.mailboxes[0]) setShareMailboxId(mailboxRes.mailboxes[0].id);
    } catch (e: any) {
      navigate("/login", { replace: true });
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addMailbox() {
    setStatus("");
    try {
      if (!emailInput.includes("@")) {
        setStatus("错误: 邮箱格式不正确");
        return;
      }
      await backend.tenantCreateMailbox(emailInput);
      setEmailInput("");
      await loadAll();
    } catch (e: any) {
      setStatus(`错误: ${e?.message ?? e}`);
    }
  }

  async function generateMailbox() {
    const domain = domainInput.trim().replace(/^@+/, "");
    if (!domain) {
      setStatus("错误: 请输入域名");
      return;
    }
    setEmailInput(`${randomLocalPart(8)}@${domain}`);
  }

  async function createShareLink() {
    setStatus("");
    try {
      if (!shareMailboxId) {
        setStatus("错误: 请选择邮箱");
        return;
      }
      await backend.tenantCreateShareLink(shareMailboxId, shareMaxQueries, shareExpiresMinutes);
      await loadAll();
    } catch (e: any) {
      setStatus(`错误: ${e?.message ?? e}`);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("复制成功");
    } catch {
      setStatus("错误: 复制失败");
    }
  }

  async function logout() {
    await backend.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>账户管理</h1>
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
            <h2>邮箱管理</h2>
            <p className="subtitle">每个登录账户只看到自己的邮箱（数据隔离）</p>
          </div>

          <div className="bulk-actions">
            <div className="input-group">
              <label>域名:</label>
              <input
                type="text"
                className="bulk-input"
                style={{ width: "220px" }}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <button className="secondary-btn" onClick={generateMailbox}>
                生成邮箱
              </button>
            </div>
            <div className="input-group">
              <label>邮箱:</label>
              <input
                type="text"
                className="bulk-input"
                style={{ width: "320px" }}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="例如: abc@dynmsl.com"
              />
              <button className="primary-btn" onClick={addMailbox}>
                保存
              </button>
            </div>
          </div>

          <div className="email-list">
            {mailboxes.length === 0 ? (
              <div className="empty-state">暂无邮箱，请先添加</div>
            ) : (
              mailboxes.map((m) => (
                <div key={m.id} className="email-item">
                  <div className="email-row">
                    <span className="label">邮箱:</span>
                    <span className="value">{m.email}</span>
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

        <div className="card fade-in">
          <div className="card-header">
            <h2>游客查询链接</h2>
            <p className="subtitle">可设置查询次数与有效时间</p>
          </div>

          <div className="bulk-actions">
            <div className="input-group">
              <label>邮箱:</label>
              <select
                className="bulk-input"
                style={{ width: "320px" }}
                value={shareMailboxId}
                onChange={(e) => setShareMailboxId(e.target.value)}
              >
                <option value="">请选择</option>
                {mailboxes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.email}
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
                生成链接
              </button>
            </div>
          </div>

          <div className="email-list">
            {shareLinks.length === 0 ? (
              <div className="empty-state">暂无链接</div>
            ) : (
              shareLinks.map((s) => {
                const url = `${shareBaseUrl}${s.token}`;
                return (
                  <div key={s.token} className="email-item">
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
                      <button className="secondary-btn" onClick={() => copy(url)}>
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

