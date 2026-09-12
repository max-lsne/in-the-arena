.PHONY: setup test evals dev lint fixtures db-reset help
.DEFAULT_GOAL := help

RUBY_BIN := /opt/rbenv/versions/3.3.6/bin
export PATH := $(RUBY_BIN):$(PATH)

help: ## List targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n", $$1, $$2}'

setup: ## Install dependencies, create databases, migrate, seed synthetic data
	cd platform && bundle install
	cd intelligence && uv sync
	cd web && pnpm install
	cd platform && bin/rails db:prepare
	cd platform && bin/rails synthetic:seed

test: ## Run every suite
	cd platform && bundle exec rspec
	cd intelligence && uv run pytest
	cd web && pnpm test && pnpm exec tsc --noEmit

lint: ## Run every linter
	cd platform && bundle exec rubocop
	cd intelligence && uv run ruff check . && uv run ruff format --check .
	cd web && pnpm lint

evals: ## Run the eval suite against recorded fixtures
	cd intelligence && uv run python -m evals.run --all

fixtures: ## Re-record LLM fixtures. Requires ANTHROPIC_API_KEY
	cd intelligence && MARS_LLM_MODE=record uv run python -m evals.run --all

db-reset: ## Drop, recreate, migrate and reseed
	cd platform && bin/rails db:drop db:create db:migrate && bin/rails synthetic:seed

dev: ## Run all three services
	@echo "platform  http://localhost:3000"
	@echo "intelligence http://localhost:8000"
	@echo "web       http://localhost:5173"
	@trap 'kill 0' EXIT; \
	(cd platform && bin/rails server -p 3000) & \
	(cd intelligence && uv run uvicorn app.main:app --reload --port 8000) & \
	(cd web && pnpm dev) & \
	wait
