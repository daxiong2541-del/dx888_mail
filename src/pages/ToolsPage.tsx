import { useState, useEffect, type ClipboardEvent as ReactClipboardEvent } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import "../App.css";
import { mailService, Email, User } from "../services/api";

const DEFAULT_TEST_TOKEN = "8d66ef93-beef-42da-baa3-2d655dd9b51d";
const BULK_ADD_PASSWORD = "dx888";
const BULK_ADD_UNLOCK_KEY = "bulkAddUnlocked";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 12;
const DEFAULT_RANDOM_USERNAME_LENGTH = 8;
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export default function ToolsPage() {
  const { email: routeEmail = "" } = useParams<{ email: string }>();
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") ?? DEFAULT_TEST_TOKEN);
  const [activeTab, setActiveTab] = useState<"fetch" | "add">("fetch");
  const [bulkAddUnlocked, setBulkAddUnlocked] = useState(() => sessionStorage.getItem(BULK_ADD_UNLOCK_KEY) === "1");
  const [bulkAddPasswordInput, setBulkAddPasswordInput] = useState("");
  const [bulkAddPasswordStatus, setBulkAddPasswordStatus] = useState("");

  const [toEmail, setToEmail] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [fetchStatus, setFetchStatus] = useState("");
  const [isLoadingFetch, setIsLoadingFetch] = useState(false);

  const [accountCount, setAccountCount] = useState<number>(10);
  const [randomUsernameLength, setRandomUsernameLength] = useState<number>(DEFAULT_RANDOM_USERNAME_LENGTH);
  const [parsedUsers, setParsedUsers] = useState<User[]>([]);
  const [addUserStatus, setAddUserStatus] = useState("");
  const [isAddingUsers, setIsAddingUsers] = useState(false);

  useEffect(() => {
    localStorage.setItem("authToken", authToken);
  }, [authToken]);

  function tryFillEmailFromText(text: string) {
    const match = text.match(EMAIL_REGEX);
    if (!match?.[0]) return false;
    const detectedEmail = match[0];
    setActiveTab("fetch");
    setToEmail(detectedEmail);
    setFetchStatus(`已识别邮箱 ${detectedEmail}，请点击查询或按回车`);
    return true;
  }

  useEffect(() => {
    if (!routeEmail) return;
    let decodedEmail = "";
    try {
      decodedEmail = decodeURIComponent(routeEmail);
    } catch {
      decodedEmail = routeEmail;
    }
    const match = decodedEmail.match(EMAIL_REGEX);
    if (!match?.[0]) return;
    const detectedEmail = match[0];
    setActiveTab("fetch");
    setToEmail(detectedEmail);
    setFetchStatus(`检测到邮箱 ${detectedEmail}，正在自动查询...`);
    setIsLoadingFetch(true);
    setTimeout(() => {
      fetchEmails(detectedEmail);
    }, 500);
  }, [routeEmail]);

  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const text = e.clipboardData?.getData("text") ?? "";
      tryFillEmailFromText(text);
    };
    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, []);

  function handlePasteFetchEmail(e: ReactClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!EMAIL_REGEX.test(text)) return;
    e.preventDefault();
    tryFillEmailFromText(text);
  }

  async function fetchEmails(emailToFetch?: string | unknown) {
    const targetEmail = typeof emailToFetch === "string" ? emailToFetch : toEmail;

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
      setFetchStatus(`错误: ${error}`);
    } finally {
      setIsLoadingFetch(false);
    }
  }

  function generateRandomString(length: number) {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ2345689";
    let ret = "";
    for (let i = 0; i < length; ++i) {
      ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
  }

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ2345689";
    const length =
      Math.floor(Math.random() * (MAX_PASSWORD_LENGTH - MIN_PASSWORD_LENGTH + 1)) + MIN_PASSWORD_LENGTH;
    let ret = "";
    for (let i = 0; i < length; ++i) {
      ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
  }

  function handleGenerateAccounts() {
    if (!accountCount || accountCount <= 0) {
      setAddUserStatus("请输入有效的生成数量。");
      return;
    }
    if (!randomUsernameLength || randomUsernameLength <= 0) {
      setAddUserStatus("请输入有效的账号长度。");
      return;
    }

    const users: User[] = [];
    for (let i = 0; i < accountCount; i++) {
      const username = generateRandomString(randomUsernameLength).toUpperCase();
      const password = generatePassword().toUpperCase();
      users.push({
        email: `${username}@dynmsl.com`,
        password
      });
    }

    setParsedUsers(users);
    setAddUserStatus(`已生成 ${users.length} 个随机账号，准备添加。`);
  }

  function handleExportTxt() {
    if (parsedUsers.length === 0) {
      setAddUserStatus("没有可导出的用户。");
      return;
    }
    const content = parsedUsers.map((u) => `${u.email}----${u.password}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addUsers() {
    if (parsedUsers.length === 0) {
      setAddUserStatus("请先生成账号。");
      return;
    }
    if (!authToken) {
      setAddUserStatus("请先填写 Token。");
      return;
    }
    setAddUserStatus("正在添加用户...");
    setIsAddingUsers(true);
    try {
      await mailService.addUsers(parsedUsers, authToken);
      setAddUserStatus("用户添加成功！");
      setParsedUsers([]);
    } catch (error) {
      setAddUserStatus(`错误: ${error}`);
    } finally {
      setIsAddingUsers(false);
    }
  }

  function unlockBulkAdd() {
    if (bulkAddPasswordInput === BULK_ADD_PASSWORD) {
      sessionStorage.setItem(BULK_ADD_UNLOCK_KEY, "1");
      setBulkAddUnlocked(true);
      setBulkAddPasswordInput("");
      setBulkAddPasswordStatus("");
      return;
    }
    setBulkAddPasswordStatus("密码错误");
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
            onChange={(e) => setAuthToken(e.target.value)}
            className="auth-input"
          />
        </div>
      </header>

      <main className="main-content">
        <div className="tabs">
          <button className={`tab-btn ${activeTab === "fetch" ? "active" : ""}`} onClick={() => setActiveTab("fetch")}>
            邮件查询
          </button>
          <button className={`tab-btn ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
            批量添加用户
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "fetch" && (
            <div className="card fade-in">
              <div className="card-header">
                <h2>查询收件箱</h2>
                <p className="subtitle">输入邮箱地址查看最新邮件</p>
              </div>
              <div
                className="search-container"
                style={{ display: "flex", gap: "20px", alignItems: "flex-start", marginBottom: "1.5rem" }}
              >
                <div style={{ flex: 1 }}>
                  <div className="search-bar" style={{ marginBottom: "1rem" }}>
                    <input
                      type="email"
                      placeholder="例如: test@dynmsl.com"
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      onPaste={handlePasteFetchEmail}
                      onKeyDown={(e) => e.key === "Enter" && fetchEmails()}
                    />
                    <button className="primary-btn" onClick={fetchEmails} disabled={isLoadingFetch}>
                      {isLoadingFetch ? "查询中..." : "查询"}
                    </button>
                  </div>
                  {fetchStatus && (
                    <div className={`status-msg ${fetchStatus.includes("错误") ? "error" : "info"}`}>{fetchStatus}</div>
                  )}
                </div>

                {toEmail && (
                  <div
                    className="qrcode-wrapper"
                    style={{
                      padding: "10px",
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      flexShrink: 0
                    }}
                  >
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
                        <span className="value">
                          {email.sendName} &lt;{email.sendEmail}&gt;
                        </span>
                      </div>
                      <div className="email-row">
                        <span className="label">收件人:</span>
                        <span className="value">
                          {email.toName} &lt;{email.toEmail}&gt;
                        </span>
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
          )}

          {activeTab === "add" && !bulkAddUnlocked && (
            <div className="card fade-in">
              <div className="card-header">
                <h2>批量添加用户</h2>
                <p className="subtitle">进入此页面需要本地验证密码</p>
              </div>

              <div className="bulk-actions">
                <div className="input-group">
                  <label>密码:</label>
                  <input
                    type="password"
                    className="bulk-input"
                    style={{ width: "220px" }}
                    placeholder="请输入密码"
                    value={bulkAddPasswordInput}
                    onChange={(e) => setBulkAddPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && unlockBulkAdd()}
                  />
                </div>
                <div className="action-buttons">
                  <button className="primary-btn" onClick={unlockBulkAdd}>
                    进入
                  </button>
                </div>
              </div>

              {bulkAddPasswordStatus && <div className="status-msg error">{bulkAddPasswordStatus}</div>}
            </div>
          )}

          {activeTab === "add" && bulkAddUnlocked && (
            <div className="card fade-in">
              <div className="card-header">
                <h2>批量添加用户</h2>
                <p className="subtitle">输入生成的账号数量，自动生成 @dynmsl.com 邮箱</p>
              </div>

              <div className="bulk-actions">
                <div className="input-group">
                  <label>生成数量:</label>
                  <input
                    type="number"
                    className="bulk-input"
                    style={{ width: "150px" }}
                    placeholder="输入数量"
                    value={accountCount}
                    onChange={(e) => setAccountCount(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                  <label>账号长度:</label>
                  <input
                    type="number"
                    className="bulk-input"
                    style={{ width: "120px" }}
                    placeholder="长度"
                    value={randomUsernameLength}
                    onChange={(e) => setRandomUsernameLength(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={handleGenerateAccounts}>
                    1. 生成随机账号
                  </button>
                  <button className="secondary-btn" onClick={handleExportTxt} disabled={parsedUsers.length === 0}>
                    2. 导出 TXT
                  </button>
                  <button
                    className="primary-btn"
                    onClick={addUsers}
                    disabled={parsedUsers.length === 0 || isAddingUsers}
                  >
                    {isAddingUsers ? "添加中..." : "3. 提交添加"}
                  </button>
                </div>
              </div>

              {addUserStatus && (
                <div className={`status-msg ${addUserStatus.includes("错误") ? "error" : "success"}`}>{addUserStatus}</div>
              )}

              {parsedUsers.length > 0 && (
                <div className="preview-list">
                  <h3>待添加列表 ({parsedUsers.length})</h3>
                  <div className="list-container">
                    {parsedUsers.map((u, i) => (
                      <div key={i} className="preview-item">
                        <span className="email">{u.email}</span>
                        <span className="divider">----</span>
                        <span className="password">{u.password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
