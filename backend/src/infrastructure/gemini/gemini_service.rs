use crate::domain::entities::{AiRequest, AiResponse};
use crate::domain::ports::AiPort;
use crate::error::AppError;
use genai::Client;
use genai::chat::{ChatMessage, ChatRequest};
use std::future::Future;
use std::pin::Pin;

/// Infrastructure adapter: implements `AiPort` using the Google Gemini API
/// via the `genai` crate.
///
/// The `GEMINI_API_KEY` environment variable is read automatically by `genai`.
pub struct GeminiService {
    client: Client,
    model: String,
}

impl GeminiService {
    /// Create a new `GeminiService`.
    /// `model` — e.g. `"gemini-2.0-flash"`.
    pub fn new(model: impl Into<String>) -> Self {
        Self {
            client: Client::default(),
            model: model.into(),
        }
    }
}

impl AiPort for GeminiService {
    fn generate(
        &self,
        request: AiRequest,
    ) -> Pin<Box<dyn Future<Output = Result<AiResponse, AppError>> + Send + '_>> {
        let client = self.client.clone();
        let model = self.model.clone();

        Box::pin(async move {
            tracing::debug!(model = %model, "Sending request to Gemini");

            let chat_req = ChatRequest::new(vec![ChatMessage::user(request.prompt)]);

            let response = client
                .exec_chat(&model, chat_req, None)
                .await
                .map_err(AppError::from)?;

            let content = response.first_text().unwrap_or_default().to_string();

            tracing::debug!(
                model = %model,
                content_len = content.len(),
                "Received response from Gemini"
            );

            Ok(AiResponse { content, model })
        })
    }
}
