# Build stage
FROM rust:1.74-alpine AS builder

RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app

COPY Cargo.toml ./
COPY src ./src

# Build with static linking for smaller image
RUN RUSTFLAGS='-C target-feature=-crt-static' cargo build --release

# Runtime stage
FROM alpine:latest

RUN apk add --no-cache libgcc openssl

WORKDIR /app

COPY --from=builder /app/target/release/health-checker .

EXPOSE 8081

CMD ["./health-checker"]
