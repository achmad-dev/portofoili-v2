use crate::domain::entities::LogEntry;
use crate::domain::ports::{AiProvider, ChatRepository};
use crate::error::AppError;
use std::sync::Arc;

pub struct AiService {
    ai_provider: Arc<dyn AiProvider>,
    chat_repo: Arc<dyn ChatRepository>,
}

impl AiService {
    pub fn new(ai_provider: Arc<dyn AiProvider>, chat_repo: Arc<dyn ChatRepository>) -> Self {
        Self { ai_provider, chat_repo }
    }

    pub async fn generate_response(&self, ip: &str, prompt: String) -> Result<String, AppError> {
        if prompt.trim().is_empty() {
            return Err(AppError::Validation("Prompt cannot be empty".to_string()));
        }

        // Rate Limits
        if !self.chat_repo.check_ip_rate_limit(ip).await? {
            return Err(AppError::RateLimit);
        }

        if !self.chat_repo.check_global_rate_limit().await? {
            return Err(AppError::RateLimit);
        }

        // Input Guardrail
        if !self.ai_provider.evaluate_guardrail(&prompt).await? {
            let _ = self.chat_repo.log_event(LogEntry {
                level: "WARNING".to_string(),
                event: "Input Guardrail Rejected".to_string(),
                details: serde_json::json!({ "ip": ip, "prompt": prompt }),
            }).await;
            return Err(AppError::Validation("Input rejected by safety guidelines.".to_string()));
        }

        // RAG Context
        let query_embedding = self.ai_provider.get_embedding(&prompt).await?;
        let similar_docs = self.chat_repo.get_similar_documents(query_embedding, 3).await?;

        let context_texts: Vec<String> = similar_docs.into_iter().map(|d| d.content).collect();
        let rag_context = context_texts.join("\n\n");

        // Memory Context
        let previous_chats = self.chat_repo.get_recent_chats(5).await?;
        let memory_context = if previous_chats.is_empty() {
            "No previous chat history.".to_string()
        } else {
            let mut history = String::new();
            for chat in previous_chats.iter().rev() {
                history.push_str(&format!("User: {}\nAI: {}\n\n", chat.user_prompt, chat.ai_response));
            }
            format!("Previous Chat History:\n{}", history)
        };

        // Combine Final Prompt
        let final_prompt = format!(
            "You are an AI assistant for a software developer's portfolio. Use the provided Context and Previous Chat History to answer the user's question concisely.\n\nContext:\n{}\n\n{}\n\nUser Question: {}",
            rag_context, memory_context, prompt
        );

        // Generate AI Content
        let response_text = self.ai_provider.generate_content(&final_prompt).await?;

        // Output Guardrail
        if !self.ai_provider.evaluate_guardrail(&response_text).await? {
            let _ = self.chat_repo.log_event(LogEntry {
                level: "WARNING".to_string(),
                event: "Output Guardrail Rejected".to_string(),
                details: serde_json::json!({ "ip": ip, "prompt": prompt, "response": response_text }),
            }).await;
            return Err(AppError::Internal("Generated response rejected by safety guidelines.".to_string()));
        }

        // Save Interaction
        self.chat_repo.save_chat(ip, &prompt, &response_text).await?;

        // Log Success
        let _ = self.chat_repo.log_event(LogEntry {
            level: "INFO".to_string(),
            event: "AI Response Generated".to_string(),
            details: serde_json::json!({ "ip": ip, "prompt_length": prompt.len(), "response_length": response_text.len() }),
        }).await;

        Ok(response_text)
    }
}
