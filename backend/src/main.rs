use std::sync::Arc;

use actix_web::{App, HttpServer, web};
use tracing_subscriber::{EnvFilter, fmt};

use backend::config::AppConfig;
use backend::infrastructure::gemini::GeminiService;
use backend::presentation::routes;
use backend::service::AiService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file if present (silently ignored if missing)
    let _ = dotenvy::dotenv();

    // Initialise structured logging.
    // Control verbosity with RUST_LOG=backend=debug,actix_web=info
    fmt()
        .with_env_filter(
            EnvFilter::from_default_env().add_directive("backend=debug".parse().unwrap()),
        )
        .init();

    let config = AppConfig::from_env();
    let bind_addr = format!("{}:{}", config.host, config.port);

    tracing::info!("Starting server on {bind_addr}");
    tracing::info!("Using Gemini model: {}", config.gemini_model);

    // ── Composition Root ─────────────────────────────────────────────────────
    // Infrastructure: concrete Gemini adapter (satisfies AiPort)
    let gemini_provider = Arc::new(GeminiService::new(config.gemini_model.clone()));

    // Service layer: business logic wired with the provider
    let ai_service = Arc::new(AiService::new(gemini_provider));

    // ── HTTP Server ──────────────────────────────────────────────────────────
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(ai_service.clone()))
            .configure(routes::configure)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
