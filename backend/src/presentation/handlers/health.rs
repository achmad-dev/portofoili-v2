use actix_web::{get, HttpResponse, Responder};

#[get("")]
pub async fn check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
}
