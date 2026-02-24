.PHONY: test test-python test-js install

test: test-python test-js

test-python:
	cd /workspaces/20260224_GitHub-copilot-workshop/1.pomodoro && python -m pytest tests/ -v || test $$? -eq 5

test-js:
	cd /workspaces/20260224_GitHub-copilot-workshop/1.pomodoro && NODE_OPTIONS='--experimental-vm-modules' npx jest static/js/tests/ --passWithNoTests

install:
	cd /workspaces/20260224_GitHub-copilot-workshop/1.pomodoro && pip install -r requirements.txt
	cd /workspaces/20260224_GitHub-copilot-workshop/1.pomodoro && npm install
