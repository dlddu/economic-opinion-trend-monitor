// Package static serves the built web app with single-page-app fallback.
//
// Real files under dir are served as-is; unknown paths fall back to index.html
// so client-side routes resolve. When the build is absent (no `make build-web`
// yet), it serves a small placeholder so the server is still useful for the API.
package static

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
)

// Handler serves dir with SPA fallback to index.html.
func Handler(dir string) http.Handler {
	fileServer := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := os.Stat(index); err != nil {
			placeholder(w)
			return
		}
		rel := filepath.FromSlash(path.Clean(r.URL.Path))
		full := filepath.Join(dir, rel)
		if info, err := os.Stat(full); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, index) // SPA fallback
	})
}

func placeholder(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!doctype html><meta charset="utf-8">
<title>Economic Opinion Trend Monitor</title>
<body style="font-family:system-ui;max-width:42rem;margin:4rem auto;line-height:1.6">
<h1>Economic Opinion Trend Monitor</h1>
<p>Serving API is up. The web build was not found.</p>
<p>Run <code>make build-web</code> to build the frontend, then reload — or use
<code>cd web &amp;&amp; npm run dev</code> for the Vite dev server.</p>
<p>API is live under <code>/api/</code> (try <a href="/api/health">/api/health</a>).</p>
</body>`))
}
