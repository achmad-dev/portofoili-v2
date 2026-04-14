use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)] pub enum AppError {
    #[error("Validation Error: {0}")]
    Validation(String),

    #[error("Internal Server Error: {0}")]
    Internal(String),

    #[error("Database Error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Rate Limit Exceeded")]
    RateLimit,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::Validation(msg) => HttpResponse::BadRequest().json(ErrorResponse {
                error: msg.clone(),
            }),
            AppError::RateLimit => HttpResponse::TooManyRequests().json(ErrorResponse {
                error: "Rate limit exceeded".to_string(),
            }),
            AppError::Database(_) | AppError::Internal(_) => {
                tracing::error!("Internal error: {:?}", self);
                HttpResponse::InternalServerError().json(ErrorResponse {
                    error: "Internal server error".to_string(),
                })
            }
        }
    }
}
