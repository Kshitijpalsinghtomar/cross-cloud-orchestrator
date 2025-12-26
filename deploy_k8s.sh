#!/bin/bash

echo "🚀 Deploying Cross-Cloud Orchestrator to Kubernetes..."

# 1. Apply Namespace
kubectl apply -f k8s/00-namespace.yaml

# 2. Apply Services & Deployments
echo "📦 Deploying Services..."
kubectl apply -f k8s/10-api.yaml
kubectl apply -f k8s/20-dashboard.yaml
kubectl apply -f k8s/30-analytics.yaml
kubectl apply -f k8s/40-monitor.yaml
kubectl apply -f k8s/50-health.yaml
kubectl apply -f k8s/60-notify.yaml

# 3. Apply Ingress
echo "🌐 Configuring Ingress..."
kubectl apply -f k8s/99-ingress.yaml

echo "✅ Deployment Complete!"
echo "👉 Check status: kubectl get all -n cc-orch"
echo "👉 Access Dashboard: http://polyglot.cloud (Add to /etc/hosts)"
