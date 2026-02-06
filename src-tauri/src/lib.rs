#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};
use std::env;

#[derive(Serialize, Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct Email {
    pub emailId: i32,
    pub sendEmail: String,
    pub sendName: String,
    pub subject: String,
    pub toEmail: String,
    pub toName: String,
    pub createTime: String,
    #[serde(rename = "type")]
    pub type_: i32,
    pub content: String,
    pub text: String,
    pub isDel: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EmailListResponse {
    pub code: i32,
    pub message: String,
    pub data: Option<Vec<Email>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct User {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AddUserResponse {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

fn api_base_url() -> String {
    env::var("DX888_MAIL_API_BASE_URL")
        .unwrap_or_else(|_| "https://mail.dynmsl.com/api/public".to_string())
        .trim_end_matches('/')
        .to_string()
}

fn api_token() -> Result<String, String> {
    env::var("DX888_MAIL_API_TOKEN").map_err(|_| "Missing DX888_MAIL_API_TOKEN".to_string())
}

#[tauri::command]
async fn fetch_emails(to_email: String) -> Result<Vec<Email>, String> {
    let client = reqwest::Client::new();
    let base_url = api_base_url();
    let token = api_token()?;
    let res = client
        .post(format!("{}/emailList", base_url))
        .header("Authorization", token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "toEmail": to_email }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response_body: EmailListResponse = res.json().await.map_err(|e| e.to_string())?;
    
    if response_body.code == 200 {
        Ok(response_body.data.unwrap_or_default())
    } else {
        Err(response_body.message)
    }
}

#[tauri::command]
async fn add_users(users: Vec<User>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let base_url = api_base_url();
    let token = api_token()?;
    let res = client
        .post(format!("{}/addUser", base_url))
        .header("Authorization", token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "list": users }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response_body: AddUserResponse = res.json().await.map_err(|e| e.to_string())?;

    if response_body.code == 200 {
        Ok("Success".to_string())
    } else {
        Err(response_body.message)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_emails, add_users])
        .run(tauri::tauri_build_context!())
        .expect("error while running tauri application");
}
