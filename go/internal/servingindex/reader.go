package servingindex

import (
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"sync"
	"time"
)

// ErrNotReady says there is no index a reader can open yet: the batch has not built one, or
// the one it names is of another schema version.
var ErrNotReady = errors.New("servingindex: no index to read yet")

// recheckEvery bounds how often a reader looks for a newer index: the pointer is one small
// read on the shared volume, and a newer index is at most this late.
const recheckEvery = time.Second

// Reader opens whichever index the pointer names, moving to a newer one as the batch publishes
// it. A request holds a Snapshot for its queries, and a replaced index closes once none does.
//
// Looking for a newer index reads the shared volume, so it happens outside mu: a slow read
// delays the one request that looks, while the rest keep the index they have.
type Reader struct {
	dir   string
	every time.Duration
	now   func() time.Time

	// looking is held by the one request reading the pointer and opening what it names.
	looking  sync.Mutex
	lastMiss string // guarded by looking

	mu      sync.Mutex
	cur     *handle
	checked time.Time
}

type handle struct {
	name    string
	builtAt string
	db      *sql.DB
	refs    int
	retired bool
}

// NewReader reads the index under the lake rooted at root. It opens nothing until first asked.
func NewReader(root string) *Reader {
	return &Reader{dir: filepath.Join(root, Dir), every: recheckEvery, now: time.Now}
}

// Snapshot is one open index, held for one request.
type Snapshot struct {
	DB      *sql.DB
	Name    string
	BuiltAt string
	r       *Reader
	h       *handle
}

// Acquire returns the newest index the reader can open, or ErrNotReady.
func (r *Reader) Acquire() (*Snapshot, error) {
	r.mu.Lock()
	have, due := r.cur != nil, r.now().Sub(r.checked) >= r.every
	r.mu.Unlock()
	switch {
	case !have:
		// Nothing to serve from yet: wait for a look already under way rather than answer not-ready.
		r.looking.Lock()
		r.look()
		r.looking.Unlock()
	case due && r.looking.TryLock():
		r.look()
		r.looking.Unlock()
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.cur == nil {
		return nil, ErrNotReady
	}
	r.cur.refs++
	return &Snapshot{DB: r.cur.db, Name: r.cur.name, BuiltAt: r.cur.builtAt, r: r, h: r.cur}, nil
}

// Release hands the snapshot back; it must be called once per Acquire.
func (s *Snapshot) Release() {
	s.r.mu.Lock()
	defer s.r.mu.Unlock()
	s.h.refs--
	if s.h.retired && s.h.refs == 0 {
		_ = s.h.db.Close()
	}
}

// look moves to the index the pointer names, at most once per interval; the caller holds
// looking. Whatever goes wrong, the reader keeps the index it has.
func (r *Reader) look() {
	r.mu.Lock()
	now := r.now()
	if now.Sub(r.checked) < r.every {
		r.mu.Unlock()
		return
	}
	r.checked = now
	current := ""
	if r.cur != nil {
		current = r.cur.name
	}
	r.mu.Unlock()

	name, err := readPointer(r.dir)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			r.miss("pointer", err)
		}
		return
	}
	if name == current {
		return
	}
	h, err := open(filepath.Join(r.dir, name))
	if err != nil {
		r.miss(name, err)
		return
	}
	h.name = name
	log.Printf("serving index: opened %s (built %s)", name, h.builtAt)
	r.lastMiss = ""

	r.mu.Lock()
	defer r.mu.Unlock()
	old := r.cur
	r.cur = h
	if old != nil {
		old.retired = true
		if old.refs == 0 {
			_ = old.db.Close()
		}
	}
}

func (r *Reader) miss(what string, err error) {
	if msg := fmt.Sprintf("%s: %v", what, err); msg != r.lastMiss {
		r.lastMiss = msg
		log.Printf("serving index: %s", msg)
	}
}

func open(path string) (*handle, error) {
	db, err := sql.Open("sqlite", readOnlyURI(path)+"&_pragma=query_only(1)&_pragma=temp_store(memory)")
	if err != nil {
		return nil, err
	}
	// Each connection keeps its own page cache; a few cover the screens' parallel fetches.
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)
	db.SetConnMaxIdleTime(time.Minute)
	var version, builtAt string
	err = db.QueryRow("SELECT (SELECT value FROM meta WHERE key = 'schema_version'), "+
		"(SELECT value FROM meta WHERE key = 'built_at')").Scan(&version, &builtAt)
	if err == nil && version != SchemaVersion {
		err = fmt.Errorf("schema version %s, this server reads %s", version, SchemaVersion)
	}
	if err != nil {
		_ = db.Close()
		return nil, err
	}
	return &handle{db: db, builtAt: builtAt}, nil
}
