use sqlx::{Connection, PgConnection, PgPool, postgres::PgPoolOptions};
use std::env;

pub async fn init_db() -> PgPool {
    let database_url = env::var("SUPABASE_URL").unwrap_or_else(|e| {
        tracing::error!(error = %e, "SUPABASE_URL must be set");
        panic!("SUPABASE_URL must be set: {e}");
    });

    // Run migrations on a dedicated single connection to avoid
    // prepared statement conflicts with the pool ("42P05" error)
    let mut conn = PgConnection::connect(&database_url)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "Failed to connect to database for migrations");
            panic!("Failed to connect for migrations: {e}");
        });

    sqlx::migrate!("./migrations")
        .run(&mut conn)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "Failed to run database migrations");
            panic!("Failed to run migrations: {e}");
        });

    tracing::info!("Database migrations applied successfully.");

    // Create the pool separately for normal application use
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "Failed to create database connection pool");
            panic!("Failed to create pool: {e}");
        })
}
