use crate::domain::entities::{ChatMessage, LogEntry, SimilarDocument};
use crate::error::AppError;
use async_trait::async_trait;
use mockall::automock;
use pgvector::Vector;

#[automock]
#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn evaluate_guardrail(&self, input: &str) -> Result<bool, AppError>;
    async fn get_embedding(&self, text: &str) -> Result<Vector, AppError>;
    async fn generate_content(&self, prompt: &str) -> Result<String, AppError>;
}

#[automock]
#[async_trait]
pub trait ChatRepository: Send + Sync {
    async fn check_ip_rate_limit(&self, ip: &str) -> Result<bool, AppError>;
    async fn check_global_rate_limit(&self) -> Result<bool, AppError>;
    async fn get_similar_documents(&self, embedding: Vector, limit: i64) -> Result<Vec<SimilarDocument>, AppError>;
    async fn get_recent_chats(&self, limit: i64) -> Result<Vec<ChatMessage>, AppError>;
    async fn save_chat(&self, ip: &str, prompt: &str, response: &str) -> Result<(), AppError>;
    async fn log_event(&self, log: LogEntry) -> Result<(), AppError>;
}
