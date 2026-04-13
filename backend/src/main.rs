use actix_web::{web, App, HttpServer, middleware::Logger};
use dotenvy::dotenv;
use reqwest::Client;

mod db;
mod ai;
mod error;
mod presentation;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Initialize database pool
    let pool = db::init_db().await;

    // Initialize HTTP client
    let client = Client::new();

    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("{}:{}", host, port);

    tracing::info!("Starting server at {}", bind_addr);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(client.clone()))
            .configure(presentation::routes::config)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
