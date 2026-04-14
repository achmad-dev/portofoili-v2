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

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)] pub struct GenerateResponse {
    pub content: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)] pub struct ErrorResponse {
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
