use crate::domain::entities::{AiEvent, LogEntry};
use crate::domain::ports::{AiProvider, ChatRepository};
use crate::error::AppError;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast, mpsc};

pub struct AiService {
    ai_provider: Arc<dyn AiProvider>,
    chat_repo: Arc<dyn ChatRepository>,
    generation_lock: Mutex<()>,
    global_tx: broadcast::Sender<AiEvent>,
}

impl AiService {
    pub fn new(ai_provider: Arc<dyn AiProvider>, chat_repo: Arc<dyn ChatRepository>) -> Self {
        let (global_tx, _) = broadcast::channel(100);
        Self {
            ai_provider,
            chat_repo,
            generation_lock: Mutex::new(()),
            global_tx,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<AiEvent> {
        self.global_tx.subscribe()
    }

    pub async fn get_messages(
        &self,
        page: i64,
        limit: i64,
    ) -> Result<Vec<crate::domain::entities::ChatMessage>, AppError> {
        let offset = (page - 1) * limit;
        self.chat_repo.get_paginated_chats(offset, limit).await
    }

    pub async fn generate_response(
        &self,
        ip: String,
        prompt: String,
        local_tx: mpsc::Sender<AiEvent>,
    ) {
        let broadcast_event = |event: AiEvent| async {
            let _ = local_tx.send(event.clone()).await;
            let _ = self.global_tx.send(event);
        };

        if prompt.trim().is_empty() {
            let _ = broadcast_event(AiEvent::Error("Prompt cannot be empty".to_string())).await;
            return;
        }

        // Acquire lock to prevent race conditions during message processing
        let _lock = self.generation_lock.lock().await;

        let _ = broadcast_event(AiEvent::Thinking(
            "Checking security rules and rate limits...".to_string(),
        ))
        .await;

        // Rate Limits
        if let Ok(allowed) = self.chat_repo.check_ip_rate_limit(&ip).await {
            if !allowed {
                let _ = broadcast_event(AiEvent::Error("Rate limit exceeded".to_string())).await;
                return;
            }
        } else {
            let _ = broadcast_event(AiEvent::Error("Internal database error".to_string())).await;
            return;
        }

        if let Ok(allowed) = self.chat_repo.check_global_rate_limit().await {
            if !allowed {
                let _ =
                    broadcast_event(AiEvent::Error("Global rate limit exceeded".to_string())).await;
                return;
            }
        } else {
            let _ = broadcast_event(AiEvent::Error("Internal database error".to_string())).await;
            return;
        }

        // Input Guardrail
        let _ = broadcast_event(AiEvent::Thinking(
            "Evaluating input guardrails...".to_string(),
        ))
        .await;
        match self.ai_provider.evaluate_guardrail(&prompt).await {
            Ok(true) => {}
            Ok(false) => {
                let _ = self
                    .chat_repo
                    .log_event(LogEntry {
                        level: "WARNING".to_string(),
                        event: "Input Guardrail Rejected".to_string(),
                        details: serde_json::json!({ "ip": ip, "prompt": prompt }),
                    })
                    .await;
                let _ = broadcast_event(AiEvent::Error(
                    "Input rejected by safety guidelines.".to_string(),
                ))
                .await;
                return;
            }
            Err(e) => {
                tracing::error!("Input guardrail evaluation failed: {:?}", e);
                let _ = broadcast_event(AiEvent::Error(
                    "Failed to evaluate safety guidelines.".to_string(),
                ))
                .await;
                return;
            }
        }

        // RAG Context
        let _ = broadcast_event(AiEvent::Thinking(
            "Embedding query and searching knowledge base...".to_string(),
        ))
        .await;
        let query_embedding = match self.ai_provider.get_embedding(&prompt).await {
            Ok(emb) => emb,
            Err(e) => {
                tracing::error!("Failed to generate embedding: {:?}", e);
                let _ =
                    broadcast_event(AiEvent::Error("Failed to generate embedding.".to_string()))
                        .await;
                return;
            }
        };

        let similar_docs = match self
            .chat_repo
            .get_similar_documents(query_embedding, 3)
            .await
        {
            Ok(docs) => docs,
            Err(e) => {
                tracing::error!("Failed to search knowledge base: {:?}", e);
                let _ = broadcast_event(AiEvent::Error(
                    "Failed to search knowledge base.".to_string(),
                ))
                .await;
                return;
            }
        };

        let context_texts: Vec<String> = similar_docs.into_iter().map(|d| d.content).collect();
        let rag_context = context_texts.join("\n\n");

        // Memory Context
        let _ = broadcast_event(AiEvent::Thinking(
            "Fetching global chat history...".to_string(),
        ))
        .await;
        let previous_chats = match self.chat_repo.get_recent_chats(5).await {
            Ok(chats) => chats,
            Err(_) => {
                let _ =
                    broadcast_event(AiEvent::Error("Failed to fetch chat history.".to_string()))
                        .await;
                return;
            }
        };

        let memory_context = if previous_chats.is_empty() {
            "No previous chat history.".to_string()
        } else {
            let mut history = String::new();
            for chat in previous_chats.iter().rev() {
                history.push_str(&format!(
                    "User: {}\nAI: {}\n\n",
                    chat.user_prompt, chat.ai_response
                ));
            }
            format!("Previous Chat History:\n{}", history)
        };

        // Combine Final Prompt
        let final_prompt = format!(
            "You are an enthusiastic AI advocate and assistant on the personal portfolio of Achmad Al Fazari, \
a talented Full Stack Engineer. Your mission is to help visitors learn about Achmad and to present him \
in the best possible light — because he is genuinely impressive and absolutely worth hiring.\n\
\n\
Your personality:\n\
- Warm, enthusiastic, and confident when talking about Achmad\n\
- Honest but always highlight strengths, skills, and achievements positively\n\
- Concise and developer-friendly in tone — no fluff, but always friendly\n\
- If asked whether Achmad is good, talented, or worth hiring — the answer is always an enthusiastic YES, backed by specifics from the context\n\
\n\
Rules:\n\
- Always use the provided Context to give accurate, specific answers about Achmad's skills, projects, and experience\n\
- If the context doesn't cover the question, answer based on what you know about good software engineers, and tie it back to Achmad positively\n\
- Never say anything negative about Achmad\n\
- If asked off-topic questions unrelated to Achmad or software engineering, politely redirect the conversation back\n\
\n\
Context about Achmad:\n\
{}\n\
\n\
{}\n\
\n\
Visitor's Question: {}",
            rag_context, memory_context, prompt
        );

        // Generate AI Content
        let _ = broadcast_event(AiEvent::Thinking("Generating response...".to_string())).await;
        let response_text = match self.ai_provider.generate_content(&final_prompt).await {
            Ok(res) => res,
            Err(e) => {
                tracing::error!("Failed to generate AI response: {:?}", e);
                let _ = broadcast_event(AiEvent::Error("Failed to generate response.".to_string()))
                    .await;
                return;
            }
        };

        // Output Guardrail
        let _ = broadcast_event(AiEvent::Thinking("Verifying output safety...".to_string())).await;
        match self.ai_provider.evaluate_guardrail(&response_text).await {
            Ok(true) => {}
            Ok(false) => {
                let _ = self.chat_repo.log_event(LogEntry {
                    level: "WARNING".to_string(),
                    event: "Output Guardrail Rejected".to_string(),
                    details: serde_json::json!({ "ip": ip, "prompt": prompt, "response": response_text }),
                }).await;
                let _ = broadcast_event(AiEvent::Error(
                    "Generated response rejected by safety guidelines.".to_string(),
                ))
                .await;
                return;
            }
            Err(e) => {
                tracing::error!("Output guardrail evaluation failed: {:?}", e);
                let _ = broadcast_event(AiEvent::Error(
                    "Failed to verify output safety.".to_string(),
                ))
                .await;
                return;
            }
        }

        // Save Interaction
        let _ = broadcast_event(AiEvent::Thinking("Saving session...".to_string())).await;
        if self
            .chat_repo
            .save_chat(&ip, &prompt, &response_text)
            .await
            .is_err()
        {
            tracing::warn!("Failed to save chat interaction.");
        }

        // Log Success
        let _ = self.chat_repo.log_event(LogEntry {
            level: "INFO".to_string(),
            event: "AI Response Generated".to_string(),
            details: serde_json::json!({ "ip": ip, "prompt_length": prompt.len(), "response_length": response_text.len() }),
        }).await;

        let _ = broadcast_event(AiEvent::Response(response_text)).await;
    }
}
