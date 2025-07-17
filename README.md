---
title: "bŏs - Business Operating System"
description: "Client/job/task management system for IT company technicians"
last_updated: "2025-07-17"
status: "active"
category: "project-root"
tags: ["readme", "setup", "getting-started", "project-overview"]
---

# bŏs - Business Operating System

## starting up

```bash
rails server
```

then in another window:

```bash
cd frontend; npm run dev
````

## how to kill the rails server

```bash
kill $(lsof -ti:3000) 2>/dev/null || kill -9 $(lsof -ti:3000)
```

## how to run testing server (not development)

```bash
RAILS_ENV=test rails server -p 3000
````


## Zero server starting

this might work:
```bash
node scripts/zero-dev-server.js > zero-server.log 2>&1 &
```

⏺ Zero Database Server Management

  Starting Zero Cache Server

  # Start Zero cache server (in project root)
  ./node_modules/.bin/zero-cache --config zero-config.json > zero-server.log 2>&1 &

  # Alternative: Start in foreground to see logs
  ./node_modules/.bin/zero-cache --config zero-config.json

  Stopping Zero Cache Server

  # Find the Zero process
  ps aux | grep zero-cache

  # Kill by process ID (replace XXXX with actual PID)
  kill XXXX

  # Or kill all Zero processes
  pkill -f zero-cache

  Rails Database Servers

  The Rails app uses three PostgreSQL databases:

  1. Primary Database: bos_development (your existing data)
  2. CVR Database: bos_development_cvr (Change View Records)
  3. CDB Database: bos_development_cdb (Change Database)

  PostgreSQL itself is managed by your system (Homebrew, Docker, etc.):

  # Start PostgreSQL (if using Homebrew)
  brew services start postgresql

  # Stop PostgreSQL  
  brew services stop postgresql

  # Check PostgreSQL status
  brew services list | grep postgresql

  Rails Server

  # Start Rails server (API backend)
  rails server -b 0.0.0.0 > /dev/null 2>&1 &

  # Stop Rails server
  pkill -f "rails server"

  Complete Development Stack

  # Start everything
  brew services start postgresql  # If not already running
  rails server -b 0.0.0.0 > rails.log 2>&1 &
  ./node_modules/.bin/zero-cache --config zero-config.json > zero-server.log 2>&1 &
  cd frontend && npm run dev  # Svelte frontend

  # Stop everything  
  pkill -f "rails server"
  pkill -f zero-cache
  # PostgreSQL can stay running
