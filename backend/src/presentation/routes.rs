use crate::presentation::handlers::{ai, health};
use actix_web::web;

/// Configure all application routes.
/// This function is passed to `App::configure()` in main.rs.
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(health::hello)
        .service(web::scope("/ai").service(ai::generate));
}
