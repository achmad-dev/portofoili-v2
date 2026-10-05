use actix_web::{HttpResponse, Responder, post, web};
use std::collections::HashMap;
use std::sync::Mutex;

use crate::presentation::extractors::HmacGuard;

// ── Ticket store ──────────────────────────────────────────────────────────────
//
// Maps ticket UUID → expiry timestamp (milliseconds since epoch).
// Tickets are single-use and expire after 5 seconds.
// Pruning of stale entries happens lazily inside `issue_ticket`.

pub type TicketStore = Mutex<HashMap<String, i64>>;

pub fn new_ticket_store() -> TicketStore {
    Mutex::new(HashMap::new())
}

// ── Response types ────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
struct TicketResponse {
    ticket: String,
}

// ── POST /api/auth/ticket ─────────────────────────────────────────────────────
//
// Protected by HmacGuard (x-timestamp + x-signature headers required).
// Issues a one-time, short-lived ticket for the EventSource stream endpoint.

#[post("/ticket")]
pub async fn issue_ticket(_guard: HmacGuard, store: web::Data<TicketStore>) -> impl Responder {
    let ticket = uuid::Uuid::new_v4().to_string();
    let expiry = chrono::Utc::now().timestamp_millis() + 5_000; // 5 seconds TTL

    let mut map = store.lock().unwrap();

    // Lazy cleanup: remove any tickets that have already expired.
    let now = chrono::Utc::now().timestamp_millis();
    map.retain(|_, exp| *exp > now);

    map.insert(ticket.clone(), expiry);

    HttpResponse::Ok().json(TicketResponse { ticket })
}

// ── Public helper: validate and consume a ticket ──────────────────────────────
//
// Called by the stream handler. Returns Ok(()) if the ticket exists and is
// still valid, Err with a descriptive message otherwise.
// On success the ticket is removed so it cannot be reused.

pub fn consume_ticket(store: &web::Data<TicketStore>, ticket: &str) -> Result<(), &'static str> {
    let mut map = store.lock().unwrap();
    match map.get(ticket) {
        None => Err("Invalid or already-used stream ticket"),
        Some(&expiry) if chrono::Utc::now().timestamp_millis() > expiry => {
            map.remove(ticket);
            Err("Stream ticket has expired")
        }
        Some(_) => {
            map.remove(ticket); // single-use: consume immediately
            Ok(())
        }
    }
}
