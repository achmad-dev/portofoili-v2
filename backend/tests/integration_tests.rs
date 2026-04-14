use actix_web::{test, App};
use backend::presentation::routes::config;
use backend::service::ai_service::AiService;
use backend::domain::ports::{MockAiProvider, MockChatRepository};
use std::sync::Arc;
use actix_web::web;
use pgvector::Vector;
use serde_json::json;
use hmac::{Hmac, Mac, KeyInit};
use sha2::Sha256;

#[actix_web::test]
async fn test_health_check() {
    let app = test::init_service(App::new().configure(config)).await;
    let req = test::TestRequest::get().uri("/api/health").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());
}

#[actix_web::test]
async fn test_ai_generate_success_with_hmac() {
    // Setup Mocks
    let mut mock_ai = MockAiProvider::new();
    let mut mock_repo = MockChatRepository::new();

    mock_repo.expect_check_ip_rate_limit().returning(|_| Ok(true));
    mock_repo.expect_check_global_rate_limit().returning(|| Ok(true));

    mock_ai.expect_evaluate_guardrail().returning(|_| Ok(true));

    mock_ai.expect_get_embedding().returning(|_| Ok(Vector::from(vec![0.0; 768])));

    mock_repo.expect_get_similar_documents().returning(|_, _| Ok(vec![]));
    mock_repo.expect_get_recent_chats().returning(|_| Ok(vec![]));

    mock_ai.expect_generate_content().returning(|_| Ok("Mocked AI response".to_string()));

    mock_repo.expect_save_chat().returning(|_, _, _| Ok(()));
    mock_repo.expect_log_event().returning(|_| Ok(()));

    let ai_service = Arc::new(AiService::new(Arc::new(mock_ai), Arc::new(mock_repo)));

    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(ai_service.clone()))
            .configure(config)
    ).await;

    // Create HMAC components
    let timestamp = chrono::Utc::now().timestamp_millis().to_string();
    let body = json!({ "prompt": "Hello world" }).to_string();
    let data_to_sign = format!("{}.{}", timestamp, body);

    unsafe { std::env::set_var("HMAC_SECRET", "test_secret"); }
    let mut mac = Hmac::<Sha256>::new_from_slice(b"test_secret").unwrap();
    mac.update(data_to_sign.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());

    let req = test::TestRequest::post()
        .uri("/api/ai/generate")
        .insert_header(("x-timestamp", timestamp))
        .insert_header(("x-signature", signature))
        .set_payload(body)
        .to_request();

    let mut resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());
    assert_eq!(resp.headers().get("content-type").unwrap().to_str().unwrap(), "text/event-stream");

    let body_bytes = actix_web::test::read_body(resp).await;
    let full_body = std::str::from_utf8(&body_bytes).unwrap().to_string();

    assert!(full_body.contains("Thinking"));
    assert!(full_body.contains("Response"));
    assert!(full_body.contains("Mocked AI response"));
}
