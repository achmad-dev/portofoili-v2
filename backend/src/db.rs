use sqlx::{Connection, PgConnection, PgPool, postgres::PgPoolOptions};
use std::env;

pub async fn init_db() -> PgPool {
    let database_url = env::var("SUPABASE_URL").expect("SUPABASE_URL must be set");

    // Run migrations on a dedicated single connection to avoid
    // prepared statement conflicts with the pool ("42P05" error)
    let mut conn = PgConnection::connect(&database_url)
        .await
        .expect("Failed to connect for migrations.");

    sqlx::migrate!("./migrations")
        .run(&mut conn)
        .await
        .expect("Failed to run migrations.");

    tracing::info!("Database migrations applied successfully.");

    // Create the pool separately for normal application use
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.")
}
