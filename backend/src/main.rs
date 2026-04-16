use actix_web::{web, App, HttpServer, middleware::Logger, http::header};
use actix_cors::Cors;
use dotenvy::dotenv;
use reqwest::Client;
use std::sync::Arc;

mod db;
mod error;
mod presentation;
mod domain;
mod infrastructure;
mod service;

use infrastructure::gemini::GeminiProvider;
use infrastructure::postgres::SupabaseRepository;
use service::ai_service::AiService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Initialize database pool
    let pool = {
        tracing::info!("Initializing database pool...");
        let p = db::init_db().await;
        tracing::info!("Database pool initialized successfully.");
        p
    };

    // Initialize HTTP client
    let client = Client::new();

    let ai_provider = Arc::new(GeminiProvider::new(client));
    let chat_repo = Arc::new(SupabaseRepository::new(pool));
    let ai_service = Arc::new(AiService::new(ai_provider, chat_repo));

    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("{}:{}", host, port);

    tracing::info!("Starting server at {}", bind_addr);

    let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_url)
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![
                header::CONTENT_TYPE,
                header::HeaderName::from_static("x-signature"),
                header::HeaderName::from_static("x-timestamp"),
            ])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(web::Data::new(ai_service.clone()))
            .configure(presentation::routes::config)
    })
    .bind(&bind_addr)
    .map_err(|e| {
        tracing::error!(error = %e, addr = %bind_addr, "Failed to bind server to address");
        e
    })?
    .run()
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Server encountered a fatal error");
        e
    })
}
