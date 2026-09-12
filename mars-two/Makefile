.PHONY: setup db-roles test evals dev lint fixtures db-reset help
.DEFAULT_GOAL := help

RUBY_BIN := /opt/rbenv/versions/3.3.6/bin
export PATH := $(RUBY_BIN):$(PATH)

help: ## List targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n", $$1, $$2}'

setup: db-roles ## Install dependencies, create databases, migrate, seed synthetic data
	cd platform && bundle install
	cd intelligence && uv sync
	cd web && pnpm install
	cd platform && bin/rails db:prepare
	cd platform && bin/rails synthetic:seed

db-roles: ## Create the owner and runtime Postgres roles. Needs superuser once
	@# pgvector installs only as superuser unless the extension is marked trusted,
	@# which is how managed Postgres services expose it.
	grep -q '^trusted' /usr/share/postgresql/16/extension/vector.control \
	  || echo 'trusted = true' | sudo tee -a /usr/share/postgresql/16/extension/vector.control
	sudo -u postgres psql -qc "DO \$$\$$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='mars') THEN CREATE ROLE mars LOGIN PASSWORD 'mars'; END IF; END \$$\$$;"
	sudo -u postgres createdb -O mars mars_two_development || true
	sudo -u postgres createdb -O mars mars_two_test || true
	sudo -u postgres psql -q -d mars_two_development -f platform/db/setup_roles.sql
	sudo -u postgres psql -q -d mars_two_test -f platform/db/setup_roles.sql

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
