package servingindex

import (
	"database/sql/driver"
	"strings"
	"sync"
	"time"

	"modernc.org/sqlite"
)

// Function is a Go function SQL can call on an index. Some answers depend on Go's own reading of
// a value — its case folding, its RFC 3339 parser, the bucket a handler cuts a timestamp to — and
// computing them in Go keeps a query exactly the scan it replaces.
type Function func(args []driver.Value) (driver.Value, error)

var (
	registerMu sync.Mutex
	registered = map[string]bool{}
)

// Register makes fn callable as name(args...) on every index opened afterwards, by the builder
// and by readers alike. Call it from an init function: a connection sees only the functions
// registered before it opened.
func Register(name string, nArgs int32, fn Function) error {
	registerMu.Lock()
	defer registerMu.Unlock()
	if registered[name] {
		return nil
	}
	err := sqlite.RegisterDeterministicScalarFunction(name, nArgs,
		func(_ *sqlite.FunctionContext, args []driver.Value) (driver.Value, error) { return fn(args) })
	if err == nil {
		registered[name] = true
	}
	return err
}

func init() {
	// SQLite's lower() folds ASCII only; the list search lowercases like the handlers do.
	mustRegister("go_lower", 1, func(args []driver.Value) (driver.Value, error) {
		s, _ := args[0].(string)
		return strings.ToLower(s), nil
	})
	// rfc3339_at_or_after(ts, since) reads ts the way time.Parse(time.RFC3339, …) does and says
	// whether it is not before since (RFC 3339 with nanoseconds); false when ts cannot be read.
	// The comparison stays in Go: a year past 2262 does not fit in Unix nanoseconds.
	mustRegister("rfc3339_at_or_after", 2, func(args []driver.Value) (driver.Value, error) {
		s, _ := args[0].(string)
		bound, _ := args[1].(string)
		at, err := time.Parse(time.RFC3339, s)
		if err != nil {
			return false, nil
		}
		since, err := lastBound.parse(bound)
		if err != nil {
			return nil, err
		}
		return !at.Before(since), nil
	})
}

func mustRegister(name string, nArgs int32, fn Function) {
	if err := Register(name, nArgs, fn); err != nil {
		panic(err)
	}
}

// boundCache keeps the last bound parsed: a query passes the same one for every row it tests.
type boundCache struct {
	mu   sync.Mutex
	text string
	at   time.Time
}

var lastBound boundCache

func (c *boundCache) parse(text string) (time.Time, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if text == c.text && text != "" {
		return c.at, nil
	}
	at, err := time.Parse(time.RFC3339Nano, text)
	if err == nil {
		c.text, c.at = text, at
	}
	return at, err
}
