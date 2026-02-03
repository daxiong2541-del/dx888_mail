import { useState, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';
import "./App.css";
import { mailService, Email } from "./services/api";

const DEFAULT_TEST_TOKEN = "87e2bd40-7208-4a43-8043-c0fda2fed1fb";

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") ?? DEFAULT_TEST_TOKEN);
  
  // Fetch Email State
  const [toEmail, setToEmail] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [fetchStatus, setFetchStatus] = useState("");
  const [isLoadingFetch, setIsLoadingFetch] = useState(false);

  useEffect(() => {
    localStorage.setItem("authToken", authToken);
  }, [authToken]);

  useEffect(() => {
    // Check for email in URL path
    let path = window.location.pathname;
    // Remove leading and trailing slashes
    path = path.replace(/^\/+|\/+$/g, '');
    
    console.log("[App] Checked path (raw):", path);

    // Try to decode first
    let decodedPath = "";
    try {
        decodedPath = decodeURIComponent(path);
    } catch (e) {
        console.error("Failed to decode path:", e);
        decodedPath = path;
    }
    
    console.log("[App] Decoded path:", decodedPath);

    // Check if the decoded path looks like an email (contains @)
    if (decodedPath && decodedPath.length > 3 && decodedPath.includes('@')) {
        console.log("[App] Found email in URL:", decodedPath);
        
        // Update state
        setToEmail(decodedPath);
        
        // Show status immediately
        setFetchStatus(`检测到邮箱 ${decodedPath}，正在自动查询...`);
        setIsLoadingFetch(true);

        // Automatically fetch emails for this address with a slight delay to ensure state updates
        setTimeout(() => {
            fetchEmails(decodedPath);
        }, 500);
    }
  }, []);

  async function fetchEmails(emailToFetch?: string | unknown) {
    const targetEmail = (typeof emailToFetch === 'string') ? emailToFetch : toEmail;
    
    if (!targetEmail) {
        setFetchStatus("请输入邮箱地址。");
        return;
    }
    if (!authToken) {
        setFetchStatus("请先填写 Token。");
        return;
    }
    setFetchStatus("获取中...");
    setIsLoadingFetch(true);
    try {
      const result = await mailService.fetchEmails(targetEmail, authToken);
      setEmails(result);
      setFetchStatus(`找到 ${result.length} 封邮件。`);
    } catch (error) {
      console.error(error);
      setFetchStatus(`错误: ${error}`);
    } finally {
      setIsLoadingFetch(false);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CloudMail Manager</h1>
        <div className="auth-settings">
           <span>Token:</span>
           <input 
                type="text" 
                value={authToken} 
                onChange={e => setAuthToken(e.target.value)} 
                className="auth-input"
            />
        </div>
      </header>

      <main className="main-content">
        <div className="card fade-in">
          <div className="card-header">
            <h2>查询收件箱</h2>
            <p className="subtitle">输入邮箱地址查看最新邮件</p>
          </div>
          <div className="search-container" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div className="search-bar" style={{ marginBottom: '1rem' }}>
                <input
                  type="email"
                  placeholder="例如: test@dynmsl.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmails()}
                />
                <button className="primary-btn" onClick={fetchEmails} disabled={isLoadingFetch}>
                  {isLoadingFetch ? '查询中...' : '查询'}
                </button>
              </div>
              {fetchStatus && <div className={`status-msg ${fetchStatus.includes('错误') ? 'error' : 'info'}`}>{fetchStatus}</div>}
            </div>

            {toEmail && (
              <div className="qrcode-wrapper" style={{
                padding: '10px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <QRCodeSVG value={toEmail} size={100} level="M" />
              </div>
            )}
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
                    <div
                      className="value content-html"
                      dangerouslySetInnerHTML={{ __html: email.content }}
                    />
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

export default App;
