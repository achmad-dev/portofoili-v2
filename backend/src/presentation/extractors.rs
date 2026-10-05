use actix_web::{
    Error as ActixError, FromRequest, HttpRequest, dev::Payload, error::ErrorUnauthorized, web,
};
use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;
use std::env;
use std::future::Future;
use std::pin::Pin;
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

// ── Shared HMAC verification helper ──────────────────────────────────────────

fn verify_hmac(signature: &str, timestamp_str: &str, data_to_sign: &str) -> Result<(), ActixError> {
    let timestamp: i64 = timestamp_str
        .parse()
        .map_err(|_| ErrorUnauthorized("Invalid x-timestamp"))?;

    let now = chrono::Utc::now().timestamp_millis();
    let window: i64 = 5 * 60 * 1000; // 5 minutes

    if (now - timestamp).abs() > window {
        return Err(ErrorUnauthorized("Request timestamp outside of window"));
    }

    let secret = env::var("HMAC_SECRET").unwrap_or_else(|_| "default_secret".to_string());
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| ErrorUnauthorized("Invalid HMAC secret"))?;

    mac.update(data_to_sign.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());

    if signature.as_bytes().ct_eq(expected.as_bytes()).unwrap_u8() != 1 {
        return Err(ErrorUnauthorized("Invalid HMAC signature"));
    }

    Ok(())
}

#[derive(Debug)]
pub struct HmacJson<T>(pub T);

impl<T> FromRequest for HmacJson<T>
where
    T: serde::de::DeserializeOwned + 'static,
{
    type Error = ActixError;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, payload: &mut Payload) -> Self::Future {
        let req_clone = req.clone();
        let payload_fut = web::Bytes::from_request(req, payload);

        Box::pin(async move {
            let bytes = payload_fut.await?;

            let signature = req_clone
                .headers()
                .get("x-signature")
                .and_then(|h| h.to_str().ok())
                .ok_or_else(|| ErrorUnauthorized("Missing x-signature header"))?;

            let timestamp_str = req_clone
                .headers()
                .get("x-timestamp")
                .and_then(|h| h.to_str().ok())
                .ok_or_else(|| ErrorUnauthorized("Missing x-timestamp header"))?;

            // Data to sign: timestamp + "." + body
            let body_str =
                std::str::from_utf8(&bytes).map_err(|_| ErrorUnauthorized("Invalid UTF-8 body"))?;
            let data_to_sign = format!("{}.{}", timestamp_str, body_str);

            verify_hmac(signature, timestamp_str, &data_to_sign)?;

            let obj: T =
                serde_json::from_slice(&bytes).map_err(actix_web::error::ErrorBadRequest)?;

            Ok(HmacJson(obj))
        })
    }
}

impl<T> std::ops::Deref for HmacJson<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

// Header-authenticated requests sign the timestamp plus an empty body.
#[derive(Debug)]
pub struct HmacGuard;

impl FromRequest for HmacGuard {
    type Error = ActixError;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        let req = req.clone();
        Box::pin(async move {
            let signature = req
                .headers()
                .get("x-signature")
                .and_then(|value| value.to_str().ok())
                .ok_or_else(|| ErrorUnauthorized("Missing x-signature header"))?;
            let timestamp = req
                .headers()
                .get("x-timestamp")
                .and_then(|value| value.to_str().ok())
                .ok_or_else(|| ErrorUnauthorized("Missing x-timestamp header"))?;
            verify_hmac(signature, timestamp, &format!("{}.", timestamp))?;
            Ok(Self)
        })
    }
}
