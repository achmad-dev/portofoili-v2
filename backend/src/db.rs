use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn init_db() -> PgPool {
    let database_url = env::var("SUPABASE_URL")
        .expect("SUPABASE_URL must be set");

    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.")
}
