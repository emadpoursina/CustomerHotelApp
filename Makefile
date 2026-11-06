# Three commands for the stack. Scripts live in scripts/.
#   make up      start the stack
#   make down    stop the stack (data kept)
#   make deploy  deploy to the production server (needs DEPLOY_HOST and DEPLOY_PATH in .env)

.PHONY: up down deploy

up:
	./scripts/up.sh

down:
	./scripts/down.sh

deploy:
	./scripts/deploy.sh
