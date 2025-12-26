# Build Stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./ # Uncomment if you have a go.sum
RUN go mod download

COPY . .

RUN go build -o resource-monitor main.go

# Run Stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/resource-monitor .

CMD ["./resource-monitor"]
