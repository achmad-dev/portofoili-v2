FROM rust:1.80-slim as builder

WORKDIR /usr/src/app
COPY . .

# Build the release binary
RUN cargo build --release

# Create a minimal runtime image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/backend /usr/local/bin/backend

# Set the environment variable for production
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["backend"]
