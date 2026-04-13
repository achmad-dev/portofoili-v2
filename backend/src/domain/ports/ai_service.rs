use crate::domain::entities::{AiRequest, AiResponse};
use crate::error::AppError;
use std::future::Future;
use std::pin::Pin;

/// Port (interface) for AI provider adapters.
/// Any AI provider (Gemini, OpenAI, etc.) must implement this trait.
///
/// Named following the Ports & Adapters (Hexagonal Architecture) pattern:
/// the domain defines WHAT it needs; adapters in the infrastructure layer
/// define HOW it is fulfilled.
///
/// `Pin<Box<dyn Future>>` is used instead of `async fn` so this trait
/// remains dyn-compatible — allowing `Arc<dyn AiPort>` for dependency injection.
pub trait AiPort: Send + Sync {
    fn generate(
        &self,
        request: AiRequest,
    ) -> Pin<Box<dyn Future<Output = Result<AiResponse, AppError>> + Send + '_>>;
}
