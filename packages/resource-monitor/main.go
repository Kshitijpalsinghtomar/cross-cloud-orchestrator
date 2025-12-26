package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

type ValidationResult struct {
	CPU    int    `json:"cpu"`
	Memory int    `json:"memory"`
	Status string `json:"status"`
}

var (
	latestResult ValidationResult
	mu           sync.RWMutex
)

func main() {
	fmt.Println("Starting Resource Monitor Service (Go)...")

	// Start background monitoring
	go monitor()

	// Start HTTP server
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		mu.RLock()
		defer mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(latestResult)
	})

	fmt.Println("Listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}

func monitor() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		checkResources()
	}
}

func checkResources() {
	cpuUsage := rand.Intn(100)
	memoryUsage := rand.Intn(100)

	status := "OK"
	if cpuUsage > 80 || memoryUsage > 80 {
		status = "WARNING"
	}

	mu.Lock()
	latestResult = ValidationResult{
		CPU:    cpuUsage,
		Memory: memoryUsage,
		Status: status,
	}
	mu.Unlock()

	fmt.Printf("[%s] Resource Check: CPU=%d%%, Memory=%d%%, Status=%s\n",
		time.Now().Format("2006-01-02 15:04:05"),
		cpuUsage,
		memoryUsage,
		status,
	)
}
