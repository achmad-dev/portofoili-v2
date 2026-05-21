use actix_web::{HttpResponse, Responder, get};

#[get("")]
pub async fn check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
}
