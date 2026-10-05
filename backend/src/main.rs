use actix_cors::Cors;
use actix_web::{
    App, HttpServer,
    http::header,
    middleware::{Logger, from_fn},
    web,
};
use dotenvy::dotenv;
use reqwest::Client;
use std::sync::Arc;

mod db;
mod domain;
mod error;
mod infrastructure;
mod presentation;
mod service;

use infrastructure::gemini::GeminiProvider;
use infrastructure::postgres::SupabaseRepository;
use presentation::handlers::auth::new_ticket_store;
use presentation::rate_limit::{IpRateLimit, enforce_ip_rate_limit};
use service::ai_service::AiService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing with env filter (set RUST_LOG=info or debug)
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .init();

    tracing::info!("Starting backend...");

    // Initialize database pool
    tracing::info!("Connecting to database...");
    let pool = db::init_db().await;
    tracing::info!("Database connected successfully");

    // Initialize HTTP client
    let client = Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .expect("Failed to initialize HTTP client");

    tracing::info!("Initializing services...");
    let ai_provider = Arc::new(GeminiProvider::new(client));
    let chat_repo = Arc::new(SupabaseRepository::new(pool));
    let ai_service = Arc::new(AiService::new(ai_provider, chat_repo));
    let ticket_store = web::Data::new(new_ticket_store());
    let trusted_proxy_hops = std::env::var("TRUSTED_PROXY_HOPS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(0);
    let ip_rate_limit = web::Data::new(IpRateLimit::new(trusted_proxy_hops));
    tracing::info!("Services initialized");

    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("{}:{}", host, port);

    let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| {
        tracing::warn!("FRONTEND_URL not set, defaulting to http://localhost:5173");
        "http://localhost:5173".to_string()
    });

    tracing::info!("CORS allowed origin: {}", frontend_url);
    tracing::info!("Binding server to {}", bind_addr);

    let server = HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_url)
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![
                header::CONTENT_TYPE,
                // POST /generate: HMAC travels in these headers
                header::HeaderName::from_static("x-signature"),
                header::HeaderName::from_static("x-timestamp"),
                // GET endpoints / EventSource: HMAC travels as query params,
                // so no extra headers needed here for those routes.
            ])
            .expose_headers([header::RETRY_AFTER])
            .max_age(3600);

        App::new()
            .app_data(ip_rate_limit.clone())
            .wrap(from_fn(enforce_ip_rate_limit))
            .wrap(cors)
            .wrap(Logger::new("%r → %s (%Dms)"))
            .app_data(web::Data::new(ai_service.clone()))
            .app_data(ticket_store.clone())
            .configure(presentation::routes::config)
    })
    .bind(&bind_addr);

    match server {
        Ok(s) => {
            tracing::info!("Server started successfully on http://{}", bind_addr);
            s.run().await.map_err(|e| {
                tracing::error!("Server crashed: {}", e);
                e
            })
        }
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", bind_addr, e);
            Err(e)
        }
    }
}
