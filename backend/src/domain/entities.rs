use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub user_prompt: String,
    pub ai_response: String,
}

#[derive(Debug, Clone)]
pub struct SimilarDocument {
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct LogEntry {
    pub level: String,
    pub event: String,
    pub details: serde_json::Value,
}
