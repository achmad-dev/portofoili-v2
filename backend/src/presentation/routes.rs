use actix_web::web;

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .service(
                web::scope("/ai")
                    .service(super::handlers::ai::generate)
                    .service(super::handlers::ai::get_messages)
                    .service(super::handlers::ai::stream_messages),
            )
            .service(web::scope("/auth").service(super::handlers::auth::issue_ticket))
            .service(web::scope("/health").service(super::handlers::health::check)),
    );
}
