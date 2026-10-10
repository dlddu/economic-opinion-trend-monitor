package main

import "testing"

func TestSoftMemoryLimitIsFourFifthsOfTheCgroupLimit(t *testing.T) {
	if got, ok := softMemoryLimit("760516944\n"); !ok || got != 608413552 {
		t.Fatalf("softMemoryLimit = %d %t, want 608413552 true", got, ok)
	}
	for _, unlimited := range []string{"max\n", "", "0"} {
		if _, ok := softMemoryLimit(unlimited); ok {
			t.Fatalf("%q must leave the runtime default alone", unlimited)
		}
	}
}
