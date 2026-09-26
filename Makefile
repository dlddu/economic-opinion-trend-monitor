PYTHON_DIR := python
GO_DIR     := go
WEB_DIR    := web
GEN_PATHS  := go/gen python/packages/core/src/econ_core/models

.DEFAULT_GOAL := help

.PHONY: help setup gen gen-check \
        build build-go build-web \
        test test-py test-go test-web test-cross e2e \
        lint lint-py lint-go lint-web lint-scenario-mapping lint-comment-ledger \
        fmt run clean

help: ## Show this help
	@echo "Economic Opinion Trend Monitor — make targets:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install all toolchain dependencies (uv / go / npm)
	cd $(PYTHON_DIR) && uv sync
	cd $(GO_DIR) && go mod download
	cd $(WEB_DIR) && npm install

gen: ## Regenerate Go + Python types from contracts/
	python3 contracts/codegen.py
	gofmt -w $(GO_DIR)/gen
	cd $(PYTHON_DIR) && uv run --quiet ruff check --fix --quiet packages/core/src/econ_core/models
	cd $(PYTHON_DIR) && uv run --quiet ruff format --quiet packages/core/src/econ_core/models

gen-check: gen ## Fail if committed generated code is stale (CI guard)
	@git diff --exit-code -- $(GEN_PATHS) \
		|| (echo "ERROR: generated code is stale. Run 'make gen' and commit." && exit 1)

build: build-go build-web ## Build serving binary + web bundle

build-go: ## Compile the Go serving binary into go/bin/serving
	cd $(GO_DIR) && go build -o bin/serving ./cmd/serving

build-web: ## Build the React frontend into web/dist
	cd $(WEB_DIR) && npm run build

test: test-py test-go test-web test-cross ## Run all tests + cross-language smoke

test-py: ## Run Python (pytest) tests
	cd $(PYTHON_DIR) && uv run pytest

test-go: ## Run Go tests
	cd $(GO_DIR) && go test ./...

test-web: ## Run web (vitest) tests
	cd $(WEB_DIR) && npm run test

test-cross: ## Cross-language smoke: Python writes Gold -> Go serves it
	./tests/smoke.sh

e2e: ## kind e2e: batch 3 stages -> pipeline Gold -> in-cluster serving -> Playwright (docker/kind/kubectl)
	./tests/e2e/run.sh

lint: lint-py lint-go lint-web lint-scenario-mapping lint-comment-ledger ## Lint all languages + scenario<->e2e mapping + comment ledger

lint-py: ## ruff check + format check
	cd $(PYTHON_DIR) && uv run ruff check . && uv run ruff format --check .

lint-go: ## gofmt + go vet
	cd $(GO_DIR) && test -z "$$(gofmt -l .)" || (echo "gofmt needs to run on:" && gofmt -l . && exit 1)
	cd $(GO_DIR) && go vet ./...

lint-web: ## eslint
	cd $(WEB_DIR) && npm run lint

lint-scenario-mapping: ## test-scenario <-> e2e spec 1:1 mapping vs doc-tracker "e2e 매핑" section
	python3 tests/e2e/check_scenario_mapping.py

lint-comment-ledger: ## comment ledger invariants (docs/comment-policy/ledger.md) + judged/open tally
	python3 scripts/check-comment-ledger.py

fmt: ## Auto-format Python + Go
	cd $(PYTHON_DIR) && uv run ruff format . && uv run ruff check --fix .
	cd $(GO_DIR) && gofmt -w .

run: ## Run the serving binary (serves API + web/dist if built)
	cd $(GO_DIR) && go run ./cmd/serving

clean: ## Remove build artifacts and local lake contents
	rm -rf $(GO_DIR)/bin $(WEB_DIR)/dist
	find data -type f ! -name '.gitkeep' -delete
