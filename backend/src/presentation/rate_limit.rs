use actix_web::{
    HttpRequest, HttpResponse,
    body::{EitherBody, MessageBody},
    dev::{ServiceRequest, ServiceResponse},
    error::Error,
    http::header::RETRY_AFTER,
    middleware::Next,
    web,
};
use std::{
    collections::HashMap,
    net::{IpAddr, Ipv4Addr},
    sync::Mutex,
    time::{Duration, Instant},
};

pub struct IpRateLimit {
    // process-local state; switch to a shared store if the API runs multiple replicas.
    buckets: Mutex<HashMap<IpAddr, Bucket>>,
    last_cleanup: Mutex<Instant>,
    trusted_proxy_hops: usize,
}

struct Bucket {
    tokens: f64,
    updated: Instant,
}

impl IpRateLimit {
    pub fn new(trusted_proxy_hops: usize) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            last_cleanup: Mutex::new(Instant::now()),
            trusted_proxy_hops,
        }
    }

    fn allow(&self, ip: IpAddr, now: Instant) -> bool {
        // One request per second on average, with room for a normal page's API burst.
        const CAPACITY: f64 = 6.0;
        let mut buckets = self.buckets.lock().unwrap();
        let mut last_cleanup = self.last_cleanup.lock().unwrap();
        if now.duration_since(*last_cleanup) >= Duration::from_secs(60) {
            buckets
                .retain(|_, bucket| now.duration_since(bucket.updated) < Duration::from_secs(60));
            *last_cleanup = now;
        }

        let bucket = buckets.entry(ip).or_insert(Bucket {
            tokens: CAPACITY,
            updated: now,
        });
        bucket.tokens =
            (bucket.tokens + now.duration_since(bucket.updated).as_secs_f64()).min(CAPACITY);
        bucket.updated = now;
        if bucket.tokens < 1.0 {
            return false;
        }
        bucket.tokens -= 1.0;
        true
    }
}

fn client_ip(request: &HttpRequest, trusted_proxy_hops: usize) -> IpAddr {
    let peer = request
        .peer_addr()
        .map(|address| address.ip())
        .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED));
    if trusted_proxy_hops == 0 {
        return peer;
    }

    let forwarded = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|header| header.to_str().ok())
        .into_iter()
        .flat_map(|value| value.split(','))
        .filter_map(|value| value.trim().parse::<IpAddr>().ok())
        .collect::<Vec<_>>();

    forwarded
        .len()
        .checked_sub(trusted_proxy_hops + 1)
        .and_then(|index| forwarded.get(index).copied())
        .unwrap_or(peer)
}

pub async fn enforce_ip_rate_limit<B>(
    request: ServiceRequest,
    next: Next<B>,
) -> Result<ServiceResponse<EitherBody<B>>, Error>
where
    B: MessageBody + 'static,
{
    let Some(state) = request.app_data::<web::Data<IpRateLimit>>() else {
        return Ok(next.call(request).await?.map_into_left_body());
    };

    let ip = client_ip(request.request(), state.trusted_proxy_hops);
    if state.allow(ip, Instant::now()) {
        return Ok(next.call(request).await?.map_into_left_body());
    }

    let response = HttpResponse::TooManyRequests()
        .insert_header((RETRY_AFTER, "1"))
        .json(serde_json::json!({ "error": "Too many requests. Retry in 1 second." }));
    Ok(request.into_response(response).map_into_right_body())
}
