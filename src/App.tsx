import { useState, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';
import "./App.css";
import { mailService, Email, User, authService, adminService, guestService, AuthMe, Tenant, TenantDomain, AppUser, GuestLink } from "./services/api";

const DEFAULT_TEST_TOKEN = "87e2bd40-7208-4a43-8043-c0fda2fed1fb";
const BULK_ADD_PASSWORD = "dx888";
const BULK_ADD_UNLOCK_KEY = "bulkAddUnlocked";

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") ?? DEFAULT_TEST_TOKEN);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("apiKey") ?? "v1");
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem("apiBaseUrl") ?? "");
  const [activeTab, setActiveTab] = useState<'fetch' | 'add' | 'admin'>('fetch');
  const [bulkAddUnlocked, setBulkAddUnlocked] = useState(() => sessionStorage.getItem(BULK_ADD_UNLOCK_KEY) === "1");
  const [bulkAddPasswordInput, setBulkAddPasswordInput] = useState("");
  const [bulkAddPasswordStatus, setBulkAddPasswordStatus] = useState("");

  const [me, setMe] = useState<AuthMe>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("");

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [guestLinks, setGuestLinks] = useState<GuestLink[]>([]);

  const [newTenantName, setNewTenantName] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user");
  const [newUserTenantId, setNewUserTenantId] = useState<number | null>(null);

  const [guestScopeType, setGuestScopeType] = useState<"email" | "domain">("email");
  const [guestScopeValue, setGuestScopeValue] = useState("");
  const [guestMaxUses, setGuestMaxUses] = useState<number>(10);
  const [guestExpiresAt, setGuestExpiresAt] = useState<string>("");
  const [guestCreatedLink, setGuestCreatedLink] = useState<string>("");

  const [adminEmailQuery, setAdminEmailQuery] = useState("");
  const [adminEmailStatus, setAdminEmailStatus] = useState("");
  const [adminEmailResults, setAdminEmailResults] = useState<Email[]>([]);
  const [adminEmailLoading, setAdminEmailLoading] = useState(false);
  
  // Fetch Email State
  const [toEmail, setToEmail] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [fetchStatus, setFetchStatus] = useState("");
  const [isLoadingFetch, setIsLoadingFetch] = useState(false);

  const pathname = window.location.pathname;
  const isGuestPage = pathname.startsWith("/g/");
  const guestToken = isGuestPage ? decodeURIComponent(pathname.slice(3).split("/")[0] ?? "") : "";
  const [guestToEmail, setGuestToEmail] = useState("");
  const [guestEmails, setGuestEmails] = useState<Email[]>([]);
  const [guestStatus, setGuestStatus] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  // Add User State
  const [accountCount, setAccountCount] = useState<number>(10);
  const [parsedUsers, setParsedUsers] = useState<User[]>([]);
  const [addUserStatus, setAddUserStatus] = useState("");
  const [isAddingUsers, setIsAddingUsers] = useState(false);

  useEffect(() => {
    localStorage.setItem("authToken", authToken);
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem("apiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (apiBaseUrl) {
      localStorage.setItem("apiBaseUrl", apiBaseUrl);
      return;
    }
    localStorage.removeItem("apiBaseUrl");
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await authService.me();
        if (cancelled) return;
        setMe(current);
        if (current?.role === "user") setActiveTab("fetch");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

    if (decodedPath.startsWith("g/")) {
        return;
    }

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

  function generateRandomString(length: number) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let ret = "";
    for (let i = 0; i < length; ++i) {
      ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
  }

  function generatePassword(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
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

    const users: User[] = [];
    for (let i = 0; i < accountCount; i++) {
      const username = generateRandomString(8);
      users.push({
        email: `${username}@dynmsl.com`,
        password: generatePassword()
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
    const content = parsedUsers.map(u => `${u.email}----${u.password}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
    setAddUserStatus("正在添加用户...");
    setIsAddingUsers(true);
    try {
      await mailService.addUsers(parsedUsers, authToken);
      setAddUserStatus("用户添加成功！");
      setParsedUsers([]);
    } catch (error) {
      console.error(error);
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

  async function handleLogin() {
    setLoginStatus("");
    try {
      await authService.login(loginEmail, loginPassword);
      const current = await authService.me();
      setMe(current);
      setLoginPassword("");
      setActiveTab("fetch");
    } catch (e) {
      setLoginStatus(`错误: ${e}`);
    }
  }

  async function handleLogout() {
    await authService.logout();
    setMe(null);
    setActiveTab("fetch");
  }

  async function refreshAdminData(nextTenantId?: number | null) {
    const t = await adminService.listTenants();
    setTenants(t);
    const u = await adminService.listUsers();
    setUsers(u);
    const g = await adminService.listGuestLinks();
    setGuestLinks(g);
    const tenantIdToUse = typeof nextTenantId === "number" ? nextTenantId : selectedTenantId ?? t?.[0]?.id ?? null;
    setSelectedTenantId(tenantIdToUse);
    setNewUserTenantId(tenantIdToUse);
    if (tenantIdToUse) {
      const d = await adminService.listDomains(tenantIdToUse);
      setDomains(d);
    } else {
      setDomains([]);
    }
  }

  useEffect(() => {
    if (me?.role !== "admin") return;
    if (activeTab !== "admin") return;
    refreshAdminData().catch(() => {});
  }, [activeTab, me?.role]);

  async function createTenant() {
    if (!newTenantName) return;
    const created = await adminService.createTenant(newTenantName);
    setNewTenantName("");
    await refreshAdminData(created.id);
  }

  async function addTenantDomain() {
    if (!selectedTenantId) return;
    if (!newDomain) return;
    await adminService.addDomain(selectedTenantId, newDomain);
    setNewDomain("");
    await refreshAdminData(selectedTenantId);
  }

  async function upsertAppUser() {
    if (!newUserEmail || !newUserPassword) return;
    const tenantId = newUserRole === "user" ? newUserTenantId : null;
    await adminService.upsertUser({ email: newUserEmail, password: newUserPassword, role: newUserRole, tenantId });
    setNewUserEmail("");
    setNewUserPassword("");
    await refreshAdminData(selectedTenantId);
  }

  async function createGuestLink() {
    if (!selectedTenantId) return;
    const expiresAt = guestExpiresAt ? new Date(guestExpiresAt).toISOString() : null;
    const created = await adminService.createGuestLink({
      tenantId: selectedTenantId,
      scopeType: guestScopeType,
      scopeValue: guestScopeValue,
      maxUses: guestMaxUses,
      expiresAt,
    });
    const base = window.location.origin;
    setGuestCreatedLink(`${base}/g/${created.token}`);
    setGuestScopeValue("");
    await refreshAdminData(selectedTenantId);
  }

  async function adminSearchEmails() {
    setAdminEmailStatus("");
    setAdminEmailLoading(true);
    try {
      const rows = await adminService.adminEmails(adminEmailQuery || undefined);
      setAdminEmailResults(rows);
      setAdminEmailStatus(`找到 ${rows.length} 封邮件。`);
    } catch (e) {
      setAdminEmailStatus(`错误: ${e}`);
    } finally {
      setAdminEmailLoading(false);
    }
  }

  async function guestFetch() {
    if (!guestToken) return;
    setGuestLoading(true);
    setGuestStatus("查询中...");
    try {
      const rows = await guestService.fetchEmails(guestToken, guestToEmail || undefined);
      setGuestEmails(rows);
      setGuestStatus(`找到 ${rows.length} 封邮件。`);
    } catch (e) {
      setGuestStatus(`错误: ${e}`);
    } finally {
      setGuestLoading(false);
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
        <div className="auth-settings">
           <span>API Key:</span>
           <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="auth-input"
            />
        </div>
        <div className="auth-settings">
           <span>API:</span>
           <input
                type="text"
                value={apiBaseUrl}
                onChange={e => setApiBaseUrl(e.target.value)}
                placeholder={`/api/${apiKey}`}
                className="auth-input"
            />
        </div>
        {!authLoading && !isGuestPage && (
          <div className="auth-settings">
            {me ? (
              <>
                <span>{me.role}</span>
                <button className="secondary-btn" onClick={handleLogout}>
                  退出
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="登录邮箱"
                  className="auth-input"
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="登录密码"
                  className="auth-input"
                />
                <button className="primary-btn" onClick={handleLogin}>
                  登录
                </button>
              </>
            )}
          </div>
        )}
        {!isGuestPage && loginStatus && (
          <div className={`status-msg ${loginStatus.includes('错误') ? 'error' : 'info'}`}>{loginStatus}</div>
        )}
      </header>

      <main className="main-content">
        {isGuestPage ? (
          <div className="card fade-in">
            <div className="card-header">
              <h2>游客查询</h2>
              <p className="subtitle">链接有效期与次数由管理员控制</p>
            </div>
            <div className="bulk-actions">
              <div className="input-group">
                <label>邮箱:</label>
                <input
                  type="email"
                  className="bulk-input"
                  style={{ width: '320px' }}
                  placeholder="如果是邮箱链接可留空"
                  value={guestToEmail}
                  onChange={(e) => setGuestToEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && guestFetch()}
                />
              </div>
              <div className="action-buttons">
                <button className="primary-btn" onClick={guestFetch} disabled={guestLoading}>
                  {guestLoading ? "查询中..." : "查询"}
                </button>
              </div>
            </div>
            {guestStatus && <div className={`status-msg ${guestStatus.includes('错误') ? 'error' : 'info'}`}>{guestStatus}</div>}
            <div className="email-list">
              {guestEmails.length === 0 ? (
                <div className="empty-state">暂无邮件数据</div>
              ) : (
                guestEmails.map((email) => (
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
        ) : (
        <>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'fetch' ? 'active' : ''}`}
              onClick={() => setActiveTab('fetch')}
            >
              邮件查询
            </button>
            <button
              className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              批量添加用户
            </button>
            {me?.role === "admin" && (
              <button
                className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                账户管理
              </button>
            )}
          </div>

          <div className="tab-content">
          {activeTab === 'fetch' && (
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
          )}

          {activeTab === 'add' && !bulkAddUnlocked && (
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
                    style={{ width: '220px' }}
                    placeholder="请输入密码"
                    value={bulkAddPasswordInput}
                    onChange={e => setBulkAddPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && unlockBulkAdd()}
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

          {activeTab === 'add' && bulkAddUnlocked && (
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
                    style={{ width: '150px' }}
                    placeholder="输入数量"
                    value={accountCount}
                    onChange={e => setAccountCount(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={handleGenerateAccounts}>
                    1. 生成随机账号
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={handleExportTxt}
                    disabled={parsedUsers.length === 0}
                  >
                    2. 导出 TXT
                  </button>
                  <button
                    className="primary-btn"
                    onClick={addUsers}
                    disabled={parsedUsers.length === 0 || isAddingUsers}
                  >
                    {isAddingUsers ? '添加中...' : '3. 提交添加'}
                  </button>
                </div>
              </div>

              {addUserStatus && <div className={`status-msg ${addUserStatus.includes('错误') ? 'error' : 'success'}`}>{addUserStatus}</div>}

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

          {activeTab === 'admin' && me?.role === "admin" && (
            <div className="card fade-in">
              <div className="card-header">
                <h2>账户管理</h2>
                <p className="subtitle">租户隔离、账号管理、游客链接</p>
              </div>

              <div className="bulk-actions">
                <div className="input-group">
                  <label>新租户:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '220px' }}
                    placeholder="例如: tenant-a"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createTenant()}
                  />
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={createTenant}>
                    创建/更新租户
                  </button>
                  <button className="secondary-btn" onClick={() => refreshAdminData()}>
                    刷新
                  </button>
                </div>
              </div>

              <div className="bulk-actions">
                <div className="input-group">
                  <label>当前租户:</label>
                  <select
                    className="bulk-input"
                    style={{ width: '220px' }}
                    value={selectedTenantId ?? ""}
                    onChange={async (e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setSelectedTenantId(id);
                      setNewUserTenantId(id);
                      if (id) setDomains(await adminService.listDomains(id));
                    }}
                  >
                    <option value="">请选择</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bulk-actions">
                <div className="input-group">
                  <label>域名:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '220px' }}
                    placeholder="例如: dynmsl.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTenantDomain()}
                  />
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={addTenantDomain} disabled={!selectedTenantId}>
                    添加域名
                  </button>
                </div>
              </div>

              {domains.length > 0 && (
                <div className="preview-list">
                  <h3>域名列表 ({domains.length})</h3>
                  <div className="list-container">
                    {domains.map((d) => (
                      <div key={d.id} className="preview-item">
                        <span className="email">{d.domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bulk-actions">
                <div className="input-group">
                  <label>账号:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '240px' }}
                    placeholder="登录邮箱"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>密码:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '200px' }}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>角色:</label>
                  <select
                    className="bulk-input"
                    style={{ width: '120px' }}
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as "admin" | "user")}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>租户:</label>
                  <select
                    className="bulk-input"
                    style={{ width: '160px' }}
                    value={newUserTenantId ?? ""}
                    disabled={newUserRole === "admin"}
                    onChange={(e) => setNewUserTenantId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">请选择</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="action-buttons">
                  <button className="primary-btn" onClick={upsertAppUser}>
                    创建/更新账号
                  </button>
                </div>
              </div>

              {users.length > 0 && (
                <div className="preview-list">
                  <h3>账号列表 ({users.length})</h3>
                  <div className="list-container">
                    {users.map((u) => (
                      <div key={u.id} className="preview-item">
                        <span className="email">{u.email}</span>
                        <span className="divider">----</span>
                        <span className="password">{u.role}{u.tenant_id ? `@${u.tenant_id}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bulk-actions">
                <div className="input-group">
                  <label>游客类型:</label>
                  <select
                    className="bulk-input"
                    style={{ width: '160px' }}
                    value={guestScopeType}
                    onChange={(e) => setGuestScopeType(e.target.value as "email" | "domain")}
                  >
                    <option value="email">邮箱</option>
                    <option value="domain">域名</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>值:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '260px' }}
                    placeholder={guestScopeType === "email" ? "例如: a@dynmsl.com" : "例如: dynmsl.com"}
                    value={guestScopeValue}
                    onChange={(e) => setGuestScopeValue(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>次数:</label>
                  <input
                    type="number"
                    className="bulk-input"
                    style={{ width: '120px' }}
                    value={guestMaxUses}
                    onChange={(e) => setGuestMaxUses(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="input-group">
                  <label>到期:</label>
                  <input
                    type="datetime-local"
                    className="bulk-input"
                    style={{ width: '220px' }}
                    value={guestExpiresAt}
                    onChange={(e) => setGuestExpiresAt(e.target.value)}
                  />
                </div>
                <div className="action-buttons">
                  <button className="secondary-btn" onClick={createGuestLink} disabled={!selectedTenantId}>
                    生成游客链接
                  </button>
                </div>
              </div>

              {guestCreatedLink && (
                <div className="status-msg success">
                  {guestCreatedLink}
                </div>
              )}

              {guestLinks.length > 0 && (
                <div className="preview-list">
                  <h3>游客链接 ({guestLinks.length})</h3>
                  <div className="list-container">
                    {guestLinks.slice(0, 30).map((g) => (
                      <div key={g.id} className="preview-item">
                        <span className="email">{g.scope_type}:{g.scope_value}</span>
                        <span className="divider">----</span>
                        <span className="password">{g.used_count}/{g.max_uses || "∞"} {g.expires_at ?? ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bulk-actions">
                <div className="input-group">
                  <label>全局查询:</label>
                  <input
                    type="text"
                    className="bulk-input"
                    style={{ width: '320px' }}
                    placeholder="toEmail 留空查询最近"
                    value={adminEmailQuery}
                    onChange={(e) => setAdminEmailQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && adminSearchEmails()}
                  />
                </div>
                <div className="action-buttons">
                  <button className="primary-btn" onClick={adminSearchEmails} disabled={adminEmailLoading}>
                    {adminEmailLoading ? "查询中..." : "查询"}
                  </button>
                </div>
              </div>
              {adminEmailStatus && <div className={`status-msg ${adminEmailStatus.includes('错误') ? 'error' : 'info'}`}>{adminEmailStatus}</div>}

              {adminEmailResults.length > 0 && (
                <div className="preview-list">
                  <h3>邮件结果 ({adminEmailResults.length})</h3>
                  <div className="list-container">
                    {adminEmailResults.slice(0, 50).map((e) => (
                      <div key={e.emailId} className="preview-item">
                        <span className="email">{e.toEmail}</span>
                        <span className="divider">----</span>
                        <span className="password">{e.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </>
        )}
      </main>
    </div>
  );
}

export default App;
