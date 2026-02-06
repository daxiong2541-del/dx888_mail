import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../App.css";
import { backend } from "../services/backend";

type Email = {
  emailId: number;
  sendEmail: string;
  sendName: string;
  subject: string;
  toEmail: string;
  toName: string;
  createTime: string;
  content: string;
};

export default function SharePage() {
  const { token } = useParams();
  const [status, setStatus] = useState("");
  const [mailbox, setMailbox] = useState<string>("");
  const [usage, setUsage] = useState<{ maxQueries: number; queriesUsed: number; expiresAt: string } | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      const data = await backend.publicShareEmails(token);
      setMailbox(data.mailbox.email);
      setUsage(data.usage);
      setEmails(data.emails as Email[]);
      setStatus(`找到 ${(data.emails ?? []).length} 封邮件。`);
    } catch (e: any) {
      setStatus(`错误: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>游客查询</h1>
        <div className="auth-settings">
          <Link to="/login" className="secondary-btn" style={{ padding: "0.4rem 0.8rem", textDecoration: "none" }}>
            登录
          </Link>
        </div>
      </header>

      <main className="main-content">
        <div className="card fade-in">
          <div className="card-header">
            <h2>查询收件箱</h2>
            <p className="subtitle">{mailbox ? mailbox : "链接查询"}</p>
          </div>

          {usage && (
            <div className="status-msg info">
              次数 {usage.queriesUsed}/{usage.maxQueries}，过期 {new Date(usage.expiresAt).toLocaleString()}
            </div>
          )}

          {status && <div className={`status-msg ${status.includes("错误") ? "error" : "info"}`}>{status}</div>}

          <div className="action-buttons" style={{ marginBottom: "1rem" }}>
            <button className="primary-btn" onClick={load} disabled={loading}>
              {loading ? "查询中..." : "刷新"}
            </button>
          </div>

          <div className="email-list">
            {emails.length === 0 ? (
              <div className="empty-state">暂无邮件数据</div>
            ) : (
              emails.map((email) => (
                <div key={email.emailId} className="email-item">
                  <div className="email-row">
                    <span className="label">主题:</span>
                    <span className="value subject">{email.subject}</span>
                  </div>
                  <div className="email-row">
                    <span className="label">发件人:</span>
                    <span className="value">{email.sendName} &lt;{email.sendEmail}&gt;</span>
                  </div>
                  <div className="email-row">
                    <span className="label">收件人:</span>
                    <span className="value">{email.toName} &lt;{email.toEmail}&gt;</span>
                  </div>
                  <div className="email-row">
                    <span className="label">时间:</span>
                    <span className="value">{email.createTime}</span>
                  </div>
                  <div className="email-row content-row">
                    <span className="label">内容:</span>
                    <div className="value content-html" dangerouslySetInnerHTML={{ __html: email.content }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

