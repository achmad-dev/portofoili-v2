use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("AI service error: {0}")]
    AiService(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal server error: {0}")]
    Internal(String),
}

impl From<genai::Error> for AppError {
    fn from(err: genai::Error) -> Self {
        AppError::AiService(err.to_string())
    }
}
