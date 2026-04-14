use actix_web::{HttpResponse, Responder, post, web, HttpRequest};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::instrument;
use tokio::sync::mpsc;
use bytes::Bytes;
use crate::error::AppError;
use crate::presentation::extractors::HmacJson;
use crate::service::ai_service::AiService;
use tokio_stream::wrappers::ReceiverStream;

#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateRequest {
    pub prompt: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)] pub struct GenerateResponse {
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

    let (tx, rx) = mpsc::channel(100);
    let prompt = body.prompt.clone();
    let srv = service.clone();

    tokio::spawn(async move {
        srv.generate_response(ip, prompt, tx).await;
    });

    let stream = ReceiverStream::new(rx);

    use futures::StreamExt;
    let sse_stream = stream.map(|event| {
        let json_data = serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string());
        Ok::<_, actix_web::Error>(Bytes::from(format!("data: {}\n\n", json_data)))
    });

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .streaming(sse_stream))
}
