# 📘 Cross-Cloud Dashboard User Manual

**Version 1.0.0**

## 1. Accessing the Dashboard
- **URL**: `http://localhost:5173`
2. Login with the default credentials:
   - **Username**: `admin`
   - **Password**: `password`

## 2. System Health Monitor
The **Home Page** displays the real-time status of your Cross-Cloud Architecture.

### Indicators
- **Green Dot / OPERATIONAL**: Service is responding normally (< 200ms latency).
- **Red Dot / OUTAGE**: Service is down or unreachable.
- **Yellow Dot / DEGRADED**: High latency or error rates.

### 💥 Chaos Mode (New!)
You can now *simulate* cloud outages to test your failover logic.
1.  Locate the **Cloud Providers** section.
2.  Click the **"Simulate Outage"** button on a provider (e.g., AWS).
3.  The status will turn **OUTAGE (Red)** immediately.
4.  Submit a workflow and watch it failover to the backup provider!
5.  Click the button again to restore service.

## 3. Workflows
### Viewing Executions
Click **Workflows** in the sidebar to see a list of past runs.
- **PENDING**: Queued for execution.
- **RUNNING**: Currently processing steps.
- **COMPLETED**: Finished successfully (even if failover was used).
- **FAILED**: All retries and fallbacks failed.

### Submitting a Workflow
1.  Go to **Submit Workflow**.
2.  Enter JSON input for your workflow.
3.  Click **Launch**.

## 4. Troubleshooting
**"Connection Error" on Dashboard?**
- Ensure the API server is running: `http://localhost:3000/health`.
- Check Docker logs: `npm run docker:logs`.
