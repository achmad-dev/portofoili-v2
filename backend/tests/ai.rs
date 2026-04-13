//! Integration tests for the AI feature:
//!   - `AiService` (business / validation logic)
//!   - `POST /ai/generate` (HTTP handler)
//!
//! A `MockAiPort` replaces the real Gemini API so these tests run
//! instantly and offline.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use actix_web::{App, test, web};
use serde_json::json;

use backend::domain::entities::{AiRequest, AiResponse};
use backend::domain::ports::AiPort;
use backend::error::AppError;
use backend::presentation::handlers::ai::generate;
use backend::service::AiService;

// ── Shared mock ───────────────────────────────────────────────────────────────

/// A fake `AiPort` that never calls the real Gemini API.
/// Controlled via `content` (the response text) and `should_fail`.
struct MockAiPort {
    content: String,
    should_fail: bool,
}

impl AiPort for MockAiPort {
    fn generate(
        &self,
        _request: AiRequest,
    ) -> Pin<Box<dyn Future<Output = Result<AiResponse, AppError>> + Send + '_>> {
        let content = self.content.clone();
        let should_fail = self.should_fail;
        Box::pin(async move {
            if should_fail {
                Err(AppError::AiService("mock provider error".to_string()))
            } else {
                Ok(AiResponse {
                    content,
                    model: "mock-model".to_string(),
                })
            }
        })
    }
}

/// Convenience constructor for `AiService` backed by a `MockAiPort`.
fn mock_service(content: &str, should_fail: bool) -> Arc<AiService> {
    Arc::new(AiService::new(Arc::new(MockAiPort {
        content: content.to_string(),
        should_fail,
    })))
}

/// Build a test actix-web `App` wired with a mock provider.
async fn build_app(
    content: &str,
    should_fail: bool,
) -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = actix_web::dev::ServiceResponse,
    Error = actix_web::Error,
> {
    test::init_service(
        App::new()
            .app_data(web::Data::new(mock_service(content, should_fail)))
            .service(web::scope("/ai").service(generate)),
    )
    .await
}

// ═══════════════════════════════════════════════════════════════════════════
// AiService unit-style tests (via public API — no private access needed)
// ═══════════════════════════════════════════════════════════════════════════

// ── Validation ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn service_rejects_empty_prompt() {
    let svc = mock_service("", false);
    let result = svc.generate_content("".to_string()).await;
    assert!(
        matches!(result, Err(AppError::Validation(_))),
        "Expected Validation error, got: {result:?}"
    );
}

#[tokio::test]
async fn service_rejects_whitespace_only_prompt() {
    let svc = mock_service("", false);
    let result = svc.generate_content("   \t\n  ".to_string()).await;
    assert!(
        matches!(result, Err(AppError::Validation(_))),
        "Expected Validation error for whitespace prompt, got: {result:?}"
    );
}

#[tokio::test]
async fn service_validation_error_message_is_non_empty() {
    let svc = mock_service("", false);
    let Err(AppError::Validation(msg)) = svc.generate_content("".to_string()).await else {
        panic!("Expected Validation error");
    };
    assert!(!msg.is_empty(), "Validation message should not be empty");
}

// ── Happy path ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn service_returns_content_from_provider() {
    let expected = "Rust is memory-safe and blazingly fast";
    let svc = mock_service(expected, false);
    let resp = svc
        .generate_content("Tell me about Rust".to_string())
        .await
        .expect("Should succeed");
    assert_eq!(resp.content, expected);
}

#[tokio::test]
async fn service_returns_model_name_from_provider() {
    let svc = mock_service("content", false);
    let resp = svc
        .generate_content("prompt".to_string())
        .await
        .expect("Should succeed");
    assert_eq!(resp.model, "mock-model");
}

#[tokio::test]
async fn service_accepts_prompt_with_surrounding_whitespace() {
    // "  hello  ".trim() is non-empty — should NOT be rejected
    let svc = mock_service("ok", false);
    let result = svc.generate_content("  hello  ".to_string()).await;
    assert!(result.is_ok(), "Padded prompt should be accepted");
}

// ── Error propagation ─────────────────────────────────────────────────────────

#[tokio::test]
async fn service_propagates_provider_error() {
    let svc = mock_service("", true);
    let result = svc.generate_content("valid prompt".to_string()).await;
    assert!(
        matches!(result, Err(AppError::AiService(_))),
        "Provider error should surface as AiService error, got: {result:?}"
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP handler integration tests  (POST /ai/generate)
// ═══════════════════════════════════════════════════════════════════════════

// ── 200 OK ────────────────────────────────────────────────────────────────────

#[actix_web::test]
async fn handler_returns_200_for_valid_prompt() {
    let app = build_app("AI says hello", false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "Say hello" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_web::test]
async fn handler_returns_content_and_model_in_body() {
    let expected = "Ownership means one owner at a time";
    let app = build_app(expected, false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "Explain ownership" }))
        .to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    assert_eq!(body["content"], expected);
    assert_eq!(body["model"], "mock-model");
}

// ── 400 Bad Request ───────────────────────────────────────────────────────────

#[actix_web::test]
async fn handler_returns_400_for_empty_prompt() {
    let app = build_app("", false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_web::test]
async fn handler_400_body_contains_error_message() {
    let app = build_app("", false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "" }))
        .to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    assert!(
        body["error"].as_str().is_some_and(|s| !s.is_empty()),
        "400 body should have a non-empty 'error' field"
    );
}

#[actix_web::test]
async fn handler_returns_400_for_whitespace_prompt() {
    let app = build_app("", false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "   " }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_web::test]
async fn handler_returns_400_for_missing_prompt_field() {
    let app = build_app("", false).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .insert_header(("Content-Type", "application/json"))
        .set_payload("{}")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

// ── 500 Internal Server Error ─────────────────────────────────────────────────

#[actix_web::test]
async fn handler_returns_500_when_provider_fails() {
    let app = build_app("", true).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "valid prompt" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 500);
}

#[actix_web::test]
async fn handler_does_not_leak_internal_error_details() {
    let app = build_app("", true).await;
    let req = test::TestRequest::post()
        .uri("/ai/generate")
        .set_json(json!({ "prompt": "valid prompt" }))
        .to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    // Must NOT expose "mock provider error" or any internal detail
    assert_eq!(
        body["error"], "Internal server error",
        "500 response must not leak internal error details"
    );
}
