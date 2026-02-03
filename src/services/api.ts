import { invoke } from "@tauri-apps/api/core";

export interface Email {
  emailId: number;
  sendEmail: string;
  sendName: string;
  subject: string;
  toEmail: string;
  toName: string;
  createTime: string;
  type: number;
  content: string;
  text: string;
  isDel: number;
}

export interface User {
  email: string;
  password: string;
}

const isTauri = () => {
    // @ts-ignore
    return !!window.__TAURI_INTERNALS__;
};

const API_BASE_URL = "/api-proxy";

export const mailService = {
  fetchEmails: async (toEmail: string, token?: string): Promise<Email[]> => {
    if (isTauri()) {
      return await invoke<Email[]>("fetch_emails", { toEmail });
    } else {
      const resolvedToken = token ?? "";
      if (!resolvedToken) {
        throw new Error("Missing authorization token");
      }
      const response = await fetch(`${API_BASE_URL}/emailList`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": resolvedToken,
        },
        body: JSON.stringify({ toEmail }),
      });
      const data = await response.json();
      if (data.code === 200) {
        return data.data || [];
      } else {
        throw new Error(data.message || "Failed to fetch emails");
      }
    }
  },

  addUsers: async (users: User[], token?: string): Promise<void> => {
    if (isTauri()) {
      await invoke("add_users", {
        users: users,
      });
    } else {
      const requestBody = { list: users };
      const resolvedToken = token ?? "";
      if (!resolvedToken) {
        throw new Error("Missing authorization token");
      }
      const response = await fetch(`${API_BASE_URL}/addUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": resolvedToken,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.code !== 200) {
        throw new Error(data.message || "Failed to add users");
      }
    }
  },
};
