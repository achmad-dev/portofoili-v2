use actix_web::{
    dev::Payload, error::ErrorUnauthorized, web, Error as ActixError, FromRequest, HttpRequest,
};
use hmac::{Hmac, Mac, KeyInit};
use sha2::Sha256;
use std::env;
use std::future::Future;
use std::pin::Pin;
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

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

            let timestamp: i64 = timestamp_str
                .parse()
                .map_err(|_| ErrorUnauthorized("Invalid x-timestamp header"))?;

            let now = chrono::Utc::now().timestamp_millis();
            let window: i64 = 5 * 60 * 1000; // 5 minutes in milliseconds

            if (now - timestamp).abs() > window {
                return Err(ErrorUnauthorized("Request timestamp outside of window"));
            }

            let secret = env::var("HMAC_SECRET").unwrap_or_else(|_| "default_secret".to_string());
            let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
                .map_err(|_| ErrorUnauthorized("Invalid HMAC secret"))?;

            // Data to sign: timestamp + "." + body
            let body_str = std::str::from_utf8(&bytes).map_err(|_| ErrorUnauthorized("Invalid UTF-8 body"))?;
            let data_to_sign = format!("{}.{}", timestamp_str, body_str);

            mac.update(data_to_sign.as_bytes());

            let expected_signature = hex::encode(mac.finalize().into_bytes());

            if signature.as_bytes().ct_eq(expected_signature.as_bytes()).unwrap_u8() != 1 {
                return Err(ErrorUnauthorized("Invalid HMAC signature"));
            }

            let obj: T = serde_json::from_slice(&bytes)
                .map_err(actix_web::error::ErrorBadRequest)?;

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
