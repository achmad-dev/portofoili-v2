use actix_web::{HttpResponse, Responder, post, web, HttpRequest};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::instrument;
use crate::error::AppError;
use crate::presentation::extractors::HmacJson;
use crate::service::ai_service::AiService;

#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateRequest {
    pub prompt: String,
}

#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub content: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)] pub struct ErrorResponse {
    pub error: String,
}

#[post("/generate")]
#[instrument(skip(service))]
pub async fn generate(
    req: HttpRequest,
    service: web::Data<Arc<AiService>>,
    body: HmacJson<GenerateRequest>,
) -> Result<impl Responder, AppError> {
    let ip = req.connection_info().realip_remote_addr().unwrap_or("unknown").to_string();

    let response_text = service.generate_response(&ip, body.prompt.clone()).await?;

    Ok(HttpResponse::Ok().json(GenerateResponse {
        content: response_text,
    }))
}
