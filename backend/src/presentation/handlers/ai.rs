use crate::error::AppError;
use crate::presentation::extractors::HmacJson;
use crate::service::ai_service::AiService;
use actix_web::{HttpRequest, HttpResponse, Responder, post, web};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tracing::instrument;

#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateRequest {
    pub prompt: String,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct GenerateResponse {
    pub content: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct ErrorResponse {
    pub error: String,
}

#[actix_web::get("/messages")]
#[instrument(skip(service))]
pub async fn get_messages(
    service: web::Data<Arc<AiService>>,
    query: web::Query<PaginationQuery>,
) -> Result<impl Responder, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 50);

    let messages = service.get_messages(page, limit).await?;

    Ok(HttpResponse::Ok().json(messages))
}

// This endpoint is designed to handle long-running AI response generation and stream results back to the client in real-time using Server-Sent Events (SSE).
#[post("/generate")]
#[instrument(skip(service))]
pub async fn generate(
    req: HttpRequest,
    service: web::Data<Arc<AiService>>,
    body: HmacJson<GenerateRequest>,
) -> Result<impl Responder, AppError> {
    let mut ip = req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();

    // Attempt to get IP from X-Forwarded-For if deployed behind a proxy
    if let Some(forwarded_for) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded_for.to_str() {
            // X-Forwarded-For can contain multiple IPs, the first one is the client
            if let Some(first_ip) = forwarded_str.split(',').next() {
                ip = first_ip.trim().to_string();
            }
        }
    }

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

#[actix_web::get("/messages/stream")]
pub async fn stream_messages(service: web::Data<Arc<AiService>>) -> impl Responder {
    let mut rx = service.subscribe();

    let stream = async_stream::stream! {
        while let Ok(event) = rx.recv().await {
            let json_data = serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string());
            yield Ok::<_, actix_web::Error>(Bytes::from(format!("data: {}\n\n", json_data)));
        }
    };

    HttpResponse::Ok()
        .content_type("text/event-stream")
        .streaming(stream)
}
