from fastapi import FastAPI
import random

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World", "Service": "Analytics Engine (Python)"}

@app.get("/analytics")
def get_analytics():
    # Simulate some analytics calculation
    users = random.randint(100, 1000)
    active_sessions = int(users * 0.8)
    return {
        "active_users": users,
        "active_sessions": active_sessions,
        "efficiency_score": 98.5
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
