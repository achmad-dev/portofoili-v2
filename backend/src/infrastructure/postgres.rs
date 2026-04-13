use crate::domain::entities::{ChatMessage, LogEntry, SimilarDocument};
use crate::domain::ports::ChatRepository;
use crate::error::AppError;
use async_trait::async_trait;
use pgvector::Vector;
use sqlx::PgPool;

pub struct SupabaseRepository {
    pool: PgPool,
}

impl SupabaseRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ChatRepository for SupabaseRepository {
    async fn check_ip_rate_limit(&self, ip: &str) -> Result<bool, AppError> {
        let today = chrono::Utc::now().date_naive();
        let count: (i64,) = sqlx::query_as("SELECT count(*) FROM chats WHERE ip_address = $1 AND DATE(created_at) = $2")
            .bind(ip)
            .bind(today)
            .fetch_one(&self.pool)
            .await?;

        Ok(count.0 < 1 || ip == "127.0.0.1" || ip == "localhost")
    }

    async fn check_global_rate_limit(&self) -> Result<bool, AppError> {
        let today = chrono::Utc::now().date_naive();
        let count: (i64,) = sqlx::query_as("SELECT count(*) FROM chats WHERE DATE(created_at) = $1")
            .bind(today)
            .fetch_one(&self.pool)
            .await?;

        Ok(count.0 < 5)
    }

    async fn get_similar_documents(&self, embedding: Vector, limit: i64) -> Result<Vec<SimilarDocument>, AppError> {
        let similar_docs: Vec<(String,)> = sqlx::query_as(
            "SELECT content FROM match_documents($1::vector, 0.5, $2)"
        )
        .bind(embedding)
        .bind(limit as i32)
        .fetch_all(&self.pool)
        .await?;

        Ok(similar_docs.into_iter().map(|d| SimilarDocument { content: d.0 }).collect())
    }

    async fn get_recent_chats(&self, limit: i64) -> Result<Vec<ChatMessage>, AppError> {
        let previous_chats: Vec<(String, String)> = sqlx::query_as(
            "SELECT user_prompt, ai_response FROM chats ORDER BY created_at DESC LIMIT $1"
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(previous_chats.into_iter().map(|c| ChatMessage { user_prompt: c.0, ai_response: c.1 }).collect())
    }

    async fn save_chat(&self, ip: &str, prompt: &str, response: &str) -> Result<(), AppError> {
        sqlx::query("INSERT INTO chats (ip_address, user_prompt, ai_response) VALUES ($1, $2, $3)")
            .bind(ip)
            .bind(prompt)
            .bind(response)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn log_event(&self, log: LogEntry) -> Result<(), AppError> {
        sqlx::query("INSERT INTO logs (level, event, details) VALUES ($1, $2, $3)")
            .bind(log.level)
            .bind(log.event)
            .bind(log.details)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
