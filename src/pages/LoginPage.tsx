import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { backend } from "../services/backend";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const user = await backend.login(email, password);
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setStatus(`错误: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CloudMail Manager</h1>
      </header>
      <main className="main-content">
        <div className="card fade-in">
          <div className="card-header">
            <h2>登录</h2>
            <p className="subtitle">登录后进入账户管理页面</p>
          </div>
          <form onSubmit={onSubmit}>
            <div className="bulk-actions">
              <div className="input-group">
                <label>邮箱:</label>
                <input
                  type="email"
                  className="bulk-input"
                  style={{ width: "320px" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入登录邮箱"
                />
              </div>
              <div className="input-group">
                <label>密码:</label>
                <input
                  type="password"
                  className="bulk-input"
                  style={{ width: "320px" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <div className="action-buttons">
                <button className="primary-btn" type="submit" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </button>
              </div>
            </div>
          </form>
          {status && <div className={`status-msg ${status.includes("错误") ? "error" : "info"}`}>{status}</div>}
        </div>
      </main>
    </div>
  );
}

