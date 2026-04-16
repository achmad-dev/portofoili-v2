use actix_web::{
    dev::Payload, error::ErrorUnauthorized, web, Error as ActixError, FromRequest, HttpRequest,
};
use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;
use std::env;
use std::future::Future;
use std::pin::Pin;
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

// ── Shared HMAC verification helper ──────────────────────────────────────────

fn verify_hmac(
    signature: &str,
    timestamp_str: &str,
    data_to_sign: &str,
) -> Result<(), ActixError> {
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
            let body_str = std::str::from_utf8(&bytes)
                .map_err(|_| ErrorUnauthorized("Invalid UTF-8 body"))?;
            let data_to_sign = format!("{}.{}", timestamp_str, body_str);

            verify_hmac(signature, timestamp_str, &data_to_sign)?;

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

// ── HmacQuery: HMAC validation via query params (for GET / EventSource) ──────
//
// The client must append `?x_timestamp=<ms>&x_signature=<hex>` to the URL.
// Signed data: "<timestamp>.<raw_query_string_without_hmac_params>"
//
// Because EventSource cannot set custom headers, signature and timestamp travel
// in the query string instead.

#[derive(Debug)]
pub struct HmacQuery<T>(pub T);

#[derive(serde::Deserialize)]
struct HmacQueryParams {
    x_timestamp: String,
    x_signature: String,
    // remaining params will be re-serialised for signing
    #[serde(flatten)]
    extra: std::collections::BTreeMap<String, String>,
}

impl<T> FromRequest for HmacQuery<T>
where
    T: serde::de::DeserializeOwned + 'static,
{
    type Error = ActixError;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        let req_clone = req.clone();

        Box::pin(async move {
            let raw_query = req_clone.query_string();

            let params: HmacQueryParams = serde_qs::from_str(raw_query)
                .map_err(|_| ErrorUnauthorized("Missing or invalid HMAC query params"))?;

            // Rebuild the canonical query string from the non-HMAC params
            // (sorted, since BTreeMap is ordered) so signing is deterministic.
            let canonical: String = params
                .extra
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect::<Vec<_>>()
                .join("&");

            let data_to_sign = format!("{}.{}", params.x_timestamp, canonical);
            verify_hmac(&params.x_signature, &params.x_timestamp, &data_to_sign)?;

            // Deserialize only the "real" query params (without HMAC fields)
            let inner: T = serde_qs::from_str(
                &params
                    .extra
                    .iter()
                    .map(|(k, v)| format!("{}={}", k, v))
                    .collect::<Vec<_>>()
                    .join("&"),
            )
            .map_err(actix_web::error::ErrorBadRequest)?;

            Ok(HmacQuery(inner))
        })
    }
}

impl<T> std::ops::Deref for HmacQuery<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
