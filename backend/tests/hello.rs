//! Integration tests for the `GET /` hello-world endpoint.
//!
//! Each test spins up an in-process actix-web app (no real network),
//! sends a request, and asserts on the response.

use actix_web::{App, test};
use backend::presentation::handlers::health::hello;

// ── Status ────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_hello_returns_200() {
    let app = test::init_service(App::new().service(hello)).await;
    let req = test::TestRequest::get().uri("/").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "GET / should return HTTP 200");
}

// ── Response body ─────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_hello_body_has_message_field() {
    let app = test::init_service(App::new().service(hello)).await;
    let req = test::TestRequest::get().uri("/").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    assert_eq!(body["message"], "Hello, World!");
}

#[actix_web::test]
async fn test_hello_body_has_status_ok() {
    let app = test::init_service(App::new().service(hello)).await;
    let req = test::TestRequest::get().uri("/").to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    assert_eq!(body["status"], "ok");
}

// ── Headers ───────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_hello_content_type_is_json() {
    let app = test::init_service(App::new().service(hello)).await;
    let req = test::TestRequest::get().uri("/").to_request();
    let resp = test::call_service(&app, req).await;
    let ct = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        ct.contains("application/json"),
        "Expected application/json, got: {ct}"
    );
}

// ── Wrong method ──────────────────────────────────────────────────────────────

#[actix_web::test]
async fn test_post_to_root_returns_404() {
    // actix-web 4 proc-macro handlers (#[get]) do not emit 405 for wrong
    // methods — unmatched requests fall through to the default 404 handler.
    let app = test::init_service(App::new().service(hello)).await;
    let req = test::TestRequest::post().uri("/").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}
