import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ToolsPage from "./pages/ToolsPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import SharePage from "./pages/SharePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToolsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/s/:token" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
