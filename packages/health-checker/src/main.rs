use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::time::{timeout, Duration};

#[derive(Serialize)]
struct HealthCheckResult {
    service: String,
    status: String,
    latency_ms: u128,
}

#[derive(Serialize)]
struct DeepHealthResponse {
    overall_status: String,
    checks: Vec<HealthCheckResult>,
    timestamp: String,
}

async fn check_service(name: &str, url: &str) -> HealthCheckResult {
    let start = Instant::now();
    
    let status = match timeout(Duration::from_secs(5), reqwest::get(url)).await {
        Ok(Ok(response)) if response.status().is_success() => "healthy".to_string(),
        Ok(Ok(response)) => format!("unhealthy: {}", response.status()),
        Ok(Err(e)) => format!("error: {}", e),
        Err(_) => "timeout".to_string(),
    };
    
    HealthCheckResult {
        service: name.to_string(),
        status,
        latency_ms: start.elapsed().as_millis(),
    }
}

async fn deep_health() -> impl Responder {
    let analytics_url = std::env::var("ANALYTICS_URL").unwrap_or_else(|_| "https://analytics:8000/health".to_string());
    let monitor_url = std::env::var("MONITOR_URL").unwrap_or_else(|_| "https://monitor:8080/health".to_string());
    let api_url = std::env::var("API_URL").unwrap_or_else(|_| "https://api:3000/health".to_string());

    let checks = vec![
        check_service("analytics-engine", &analytics_url).await,
        check_service("resource-monitor", &monitor_url).await,
        check_service("orchestrator-api", &api_url).await,
    ];

    let overall_status = if checks.iter().all(|c| c.status == "healthy") {
        "healthy"
    } else if checks.iter().any(|c| c.status == "healthy") {
        "degraded"
    } else {
        "unhealthy"
    };

    HttpResponse::Ok().json(DeepHealthResponse {
        overall_status: overall_status.to_string(),
        checks,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

async fn root() -> impl Responder {
    HttpResponse::Ok().body("Rust Health Checker Service v1.0")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🦀 Rust Health Checker starting on port 8081...");
    
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(root))
            .route("/health/deep", web::get().to(deep_health))
    })
    .bind("0.0.0.0:8081")?
    .run()
    .await
}
