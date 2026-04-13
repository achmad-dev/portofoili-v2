/// Represents a request to generate AI content.
#[derive(Debug, Clone)]
pub struct AiRequest {
    /// The user prompt to send to the AI model.
    pub prompt: String,
}

/// Represents an AI-generated response.
#[derive(Debug, Clone)]
pub struct AiResponse {
    /// The generated text content.
    pub content: String,
    /// The model that generated the response.
    pub model: String,
}
