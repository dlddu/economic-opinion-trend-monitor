// Command econ-index builds the serving index from the data lake and publishes it beside the
// lake for the serving pod.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/servingindex"
)

func main() {
	dataRoot := flag.String("data", envOr("ECON_DATA_ROOT", "../data"), "data lake root")
	scratch := flag.String("scratch", os.TempDir(), "local directory to build in")
	grace := flag.Duration("grace", servingindex.DefaultGrace, "how long a replaced index stays for readers still holding it")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	start := time.Now()
	stats, err := servingindex.Build(ctx, *dataRoot, servingindex.Options{
		Scratch: *scratch,
		Grace:   *grace,
		Log:     log.Printf,
	})
	if err != nil {
		log.Fatalf("econ-index: %v", err)
	}
	log.Printf("econ-index: published %s records=%d analyses=%d news_items=%d article_picks=%d subject_trends=%d call_files=%d "+
		"(reused=%d read=%d undecoded=%d) took=%s",
		stats.Name, stats.Records, stats.Analyses, stats.NewsItems, stats.ArticlePicks, stats.SubjectTrends, stats.CallFiles,
		stats.CallsReused, stats.CallsRead, stats.CallsUndecoded, time.Since(start).Round(time.Millisecond))
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
