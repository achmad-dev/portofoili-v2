use actix_web::web;

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .service(
                web::scope("/ai")
                    .service(super::handlers::ai::generate)
            )
            .service(
                web::scope("/health")
                    .service(super::handlers::health::check)
            )
    );
}
