package servingindex

import (
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// publish copies the built index onto the volume under its own name, then points readers at it.
// A file is never replaced in place: a reader on another node holding the old one open would
// read a file that changed under it, so each build gets a new name and only the pointer moves.
func publish(dir, local, name string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	if err := copyWhole(local, filepath.Join(dir, name)); err != nil {
		return err
	}
	return writeWhole(filepath.Join(dir, pointerName), func(w io.Writer) error {
		_, err := fmt.Fprintln(w, name)
		return err
	})
}

func copyWhole(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	return writeWhole(dst, func(w io.Writer) error {
		_, err := io.Copy(w, in)
		return err
	})
}

// writeWhole writes to a temporary name and renames it into place, so a reader sees the old file or the whole new one.
func writeWhole(path string, fill func(io.Writer) error) error {
	tmp := filepath.Join(filepath.Dir(path), tmpPrefix+filepath.Base(path)+tmpSuffix)
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	err = fill(f)
	if err == nil {
		err = f.Sync()
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err == nil {
		err = os.Rename(tmp, path)
	}
	if err != nil {
		_ = os.Remove(tmp)
	}
	return err
}

// sweep removes indexes other than current last changed before cutoff, and temporary files a
// failed build left. It touches nothing in dir but its own index and temporary names.
func sweep(dir, current string, cutoff time.Time) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var removed []string
	for _, e := range entries {
		name := e.Name()
		ours := isIndexName(name) ||
			(strings.HasPrefix(name, tmpPrefix) && strings.HasSuffix(name, tmpSuffix) &&
				(isIndexName(strings.TrimSuffix(strings.TrimPrefix(name, tmpPrefix), tmpSuffix)) ||
					name == tmpPrefix+pointerName+tmpSuffix))
		if !ours || name == current || e.IsDir() {
			continue
		}
		info, err := e.Info()
		if err != nil || !info.ModTime().Before(cutoff) {
			continue
		}
		if err := os.Remove(filepath.Join(dir, name)); err != nil {
			return removed, err
		}
		removed = append(removed, name)
	}
	return removed, nil
}

func isIndexName(name string) bool {
	return strings.HasPrefix(name, filePrefix) && strings.HasSuffix(name, fileSuffix) &&
		!strings.ContainsAny(name, `/\`)
}

// readPointer names the current index file in dir.
func readPointer(dir string) (string, error) {
	raw, err := os.ReadFile(filepath.Join(dir, pointerName))
	if err != nil {
		return "", err
	}
	name := strings.TrimSpace(string(raw))
	if !isIndexName(name) {
		return "", fmt.Errorf("%s names %q, not an index file", pointerName, name)
	}
	return name, nil
}

// readOnlyURI opens a published index without locks or journal files: the volume is shared
// over NFS, where SQLite's locks are not to be trusted, and a published index never changes.
func readOnlyURI(path string) string {
	u := url.URL{Scheme: "file", Path: path, RawQuery: "mode=ro&immutable=1"}
	return u.String()
}
