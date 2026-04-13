use crate::domain::entities::{AiRequest, AiResponse};
use crate::domain::ports::AiPort;
use crate::error::AppError;
use std::sync::Arc;

/// Application service for AI content generation.
///
/// This layer sits between the HTTP presentation layer and the domain ports.
/// It is responsible for:
/// - Input validation (business rules independent of HTTP)
/// - Orchestrating calls to the domain port (`AiPort`)
/// - Keeping use-case logic out of both the HTTP handlers and the domain entities
pub struct AiService {
    provider: Arc<dyn AiPort>,
}

impl AiService {
    pub fn new(provider: Arc<dyn AiPort>) -> Self {
        Self { provider }
    }

    /// Generate AI content for the given prompt.
    /// Returns `AppError::Validation` if the prompt is blank.
    pub async fn generate_content(&self, prompt: String) -> Result<AiResponse, AppError> {
        if prompt.trim().is_empty() {
            return Err(AppError::Validation("Prompt cannot be empty".to_string()));
        }

        let request = AiRequest { prompt };
        self.provider.generate(request).await
    }
}
