use crate::domain::entities::{AiEvent, LogEntry};
use crate::domain::ports::{AiProvider, ChatRepository};
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct AiService {
    ai_provider: Arc<dyn AiProvider>,
    chat_repo: Arc<dyn ChatRepository>,
}

impl AiService {
    pub fn new(ai_provider: Arc<dyn AiProvider>, chat_repo: Arc<dyn ChatRepository>) -> Self {
        Self { ai_provider, chat_repo }
    }

    pub async fn generate_response(&self, ip: String, prompt: String, tx: mpsc::Sender<AiEvent>) {
        if prompt.trim().is_empty() {
            let _ = tx.send(AiEvent::Error("Prompt cannot be empty".to_string())).await;
            return;
        }

        let _ = tx.send(AiEvent::Thinking("Checking security rules and rate limits...".to_string())).await;

        // Rate Limits
        if let Ok(allowed) = self.chat_repo.check_ip_rate_limit(&ip).await {
            if !allowed {
                let _ = tx.send(AiEvent::Error("Rate limit exceeded".to_string())).await;
                return;
            }
        } else {
            let _ = tx.send(AiEvent::Error("Internal database error".to_string())).await;
            return;
        }

        if let Ok(allowed) = self.chat_repo.check_global_rate_limit().await {
            if !allowed {
                let _ = tx.send(AiEvent::Error("Global rate limit exceeded".to_string())).await;
                return;
            }
        } else {
            let _ = tx.send(AiEvent::Error("Internal database error".to_string())).await;
            return;
        }

        // Input Guardrail
        let _ = tx.send(AiEvent::Thinking("Evaluating input guardrails...".to_string())).await;
        match self.ai_provider.evaluate_guardrail(&prompt).await {
            Ok(true) => {}
            Ok(false) => {
                let _ = self.chat_repo.log_event(LogEntry {
                    level: "WARNING".to_string(),
                    event: "Input Guardrail Rejected".to_string(),
                    details: serde_json::json!({ "ip": ip, "prompt": prompt }),
                }).await;
                let _ = tx.send(AiEvent::Error("Input rejected by safety guidelines.".to_string())).await;
                return;
            }
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to evaluate safety guidelines.".to_string())).await;
                return;
            }
        }

        // RAG Context
        let _ = tx.send(AiEvent::Thinking("Embedding query and searching knowledge base...".to_string())).await;
        let query_embedding = match self.ai_provider.get_embedding(&prompt).await {
            Ok(emb) => emb,
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to generate embedding.".to_string())).await;
                return;
            }
        };

        let similar_docs = match self.chat_repo.get_similar_documents(query_embedding, 3).await {
            Ok(docs) => docs,
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to search knowledge base.".to_string())).await;
                return;
            }
        };

        let context_texts: Vec<String> = similar_docs.into_iter().map(|d| d.content).collect();
        let rag_context = context_texts.join("\n\n");

        // Memory Context
        let _ = tx.send(AiEvent::Thinking("Fetching global chat history...".to_string())).await;
        let previous_chats = match self.chat_repo.get_recent_chats(5).await {
            Ok(chats) => chats,
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to fetch chat history.".to_string())).await;
                return;
            }
        };

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
        let _ = tx.send(AiEvent::Thinking("Generating response...".to_string())).await;
        let response_text = match self.ai_provider.generate_content(&final_prompt).await {
            Ok(res) => res,
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to generate response.".to_string())).await;
                return;
            }
        };

        // Output Guardrail
        let _ = tx.send(AiEvent::Thinking("Verifying output safety...".to_string())).await;
        match self.ai_provider.evaluate_guardrail(&response_text).await {
            Ok(true) => {}
            Ok(false) => {
                let _ = self.chat_repo.log_event(LogEntry {
                    level: "WARNING".to_string(),
                    event: "Output Guardrail Rejected".to_string(),
                    details: serde_json::json!({ "ip": ip, "prompt": prompt, "response": response_text }),
                }).await;
                let _ = tx.send(AiEvent::Error("Generated response rejected by safety guidelines.".to_string())).await;
                return;
            }
            Err(_) => {
                let _ = tx.send(AiEvent::Error("Failed to verify output safety.".to_string())).await;
                return;
            }
        }

        // Save Interaction
        let _ = tx.send(AiEvent::Thinking("Saving session...".to_string())).await;
        if self.chat_repo.save_chat(&ip, &prompt, &response_text).await.is_err() {
            tracing::warn!("Failed to save chat interaction.");
        }

        // Log Success
        let _ = self.chat_repo.log_event(LogEntry {
            level: "INFO".to_string(),
            event: "AI Response Generated".to_string(),
            details: serde_json::json!({ "ip": ip, "prompt_length": prompt.len(), "response_length": response_text.len() }),
        }).await;

        let _ = tx.send(AiEvent::Response(response_text)).await;
    }
}
