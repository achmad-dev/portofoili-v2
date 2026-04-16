FROM rust:1.88-slim AS builder

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*


COPY backend/ .

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/backend /usr/local/bin/backend
COPY --from=builder /usr/src/app/migrations /migrations

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["backend"]
