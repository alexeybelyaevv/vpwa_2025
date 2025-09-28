DOCKER_COMPOSE ?= docker compose

.PHONY: up up-detached build down logs reset backend-shell frontend-shell db-shell

up: ## Build and start the stack in the foreground
	$(DOCKER_COMPOSE) up --build

up-detached: ## Build and start the stack in the background
	$(DOCKER_COMPOSE) up -d --build

build: ## Rebuild backend and frontend images
	$(DOCKER_COMPOSE) build frontend backend

down: ## Stop containers (keeps volumes)
	$(DOCKER_COMPOSE) down

logs: ## Follow service logs
	$(DOCKER_COMPOSE) logs -f

reset: ## Stop containers and wipe volumes (destroys DB data)
	$(DOCKER_COMPOSE) down --volumes --remove-orphans

backend-shell: ## Open a shell inside the backend container
	$(DOCKER_COMPOSE) exec backend sh

frontend-shell: ## Open a shell inside the frontend container
	$(DOCKER_COMPOSE) exec frontend sh

db-shell: ## Open psql inside the Postgres container
	$(DOCKER_COMPOSE) exec postgres psql -U vpwa -d vpwa
