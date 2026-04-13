use actix_web::{HttpResponse, Responder, get};
use serde_json::json;

/// `GET /`
///
/// A simple health-check / hello-world endpoint.
///
/// ## Rust concepts demonstrated here:
/// - `#[get("/")]` — a proc-macro that registers this function as an HTTP GET handler
/// - `async fn` — Rust's async function; must be awaited by the runtime (Tokio)
/// - `impl Responder` — return-position impl Trait; any type implementing `Responder` is valid
/// - `HttpResponse::Ok()` — builder for a 200 OK response
/// - `.json(...)` — serialises the value to JSON, sets `Content-Type: application/json`
/// - `json!(...)` macro from `serde_json` — constructs a `serde_json::Value` inline
#[get("/")]
pub async fn hello() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "message": "Hello, World!",
        "status": "ok"
    }))
}
