// Command serving boots the HTTP server: it reads Gold from the data lake,
// exposes the per-screen API under /api/, and serves the web build at /.
package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/handlers"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/static"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func main() {
	addr := flag.String("addr", envOr("ECON_ADDR", ":8080"), "listen address")
	dataRoot := flag.String("data", envOr("ECON_DATA_ROOT", "../data"), "data lake root")
	webDir := flag.String("web", envOr("ECON_WEB_DIR", "../web/dist"), "web build directory to serve")
	flag.Parse()

	lake := store.New(*dataRoot)
	api := handlers.New(lake)

	mux := http.NewServeMux()
	api.Register(mux)
	mux.Handle("/", static.Handler(*webDir))

	srv := &http.Server{
		Addr:              *addr,
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("serving on %s (data=%s web=%s)", *addr, *dataRoot, *webDir)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Probes hit /api/health every few seconds; keep them out of the
		// access log so it only shows real traffic.
		if r.URL.Path == "/api/health" {
			next.ServeHTTP(w, r)
			return
		}
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
