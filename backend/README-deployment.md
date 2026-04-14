# Deployment Guide

This backend is designed using Clean Architecture and can be deployed in a variety of ways.

## 1. Deploying with Docker (Render, Koyeb, Railway)

A standard Dockerfile is provided. Platforms like Render or Koyeb can automatically pull from your repository, build the Dockerfile, and host it on their free tiers.

Make sure you configure the following environment variables in your deployment dashboard:
- `SUPABASE_URL` (PostgreSQL Connection String)
- `VITE_GEMINI_API_KEY` (Your Gemini Key)
- `HMAC_SECRET` (Shared secret string for securing the endpoints)
- `FRONTEND_URL` (e.g., `https://myportfolio.com`)
- `HOST` (`0.0.0.0`)
- `PORT` (`8080` or dynamically assigned)

## 2. Deploying with Shuttle (shuttle.rs)

Shuttle is a native Rust hosting platform with an excellent free tier. To deploy using Shuttle, you need to convert the `main.rs` to use the `shuttle-actix-web` macro.

### Setup Shuttle
1. Install the CLI: `cargo binstall cargo-shuttle` (or `cargo install cargo-shuttle`)
2. Login: `cargo shuttle login`
3. Initialize: `cargo shuttle init` (if setting up from scratch)

*Note: Since Shuttle manages the HTTP server execution, you will need to replace the `#[actix_web::main]` macro in `src/main.rs` with `#[shuttle_actix_web::main]`, and return `ShuttleActixWeb` instead of `std::io::Result<()>`. To prevent modifying your local development setup, you can maintain a separate branch or conditionally compile the Shuttle setup.*
