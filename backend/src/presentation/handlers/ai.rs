use actix_web::{HttpResponse, Responder, post, web};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::instrument;

use crate::error::AppError;
use crate::service::AiService;

// ─── Request / Response DTOs ─────────────────────────────────────────────────

/// JSON body expected on `POST /ai/generate`.
#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateRequest {
    pub prompt: String,
}

/// JSON body returned on success.
#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub content: String,
    pub model: String,
}

/// JSON body returned on error.
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/// `POST /ai/generate`
///
/// Accepts a JSON prompt and returns the Gemini-generated response.
///
/// ## Request
/// ```json
/// { "prompt": "Explain Rust ownership in one paragraph" }
/// ```
///
/// ## Responses
/// | Status | Meaning |
/// |--------|---------|
/// | 200 | AI response generated successfully |
/// | 400 | Prompt was empty / failed validation |
/// | 500 | Upstream AI provider error |
#[post("/generate")]
#[instrument(skip(service))]
pub async fn generate(
    service: web::Data<Arc<AiService>>,
    body: web::Json<GenerateRequest>,
) -> impl Responder {
    match service.generate_content(body.prompt.clone()).await {
        Ok(response) => HttpResponse::Ok().json(GenerateResponse {
            content: response.content,
            model: response.model,
        }),
        Err(AppError::Validation(msg)) => {
            HttpResponse::BadRequest().json(ErrorResponse { error: msg })
        }
        Err(e) => {
            tracing::error!("AI generation failed: {e}");
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Internal server error".to_string(),
            })
        }
    }
}
