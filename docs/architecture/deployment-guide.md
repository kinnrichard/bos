# bŏs Deployment Guide

## Overview

This guide covers deploying bŏs to production using Kamal, a deployment tool that builds and deploys containerized Rails applications. The application is configured for single-server deployment with PostgreSQL database.

## Prerequisites

### Local Development Machine
- Docker installed and running
- Ruby 3.4.4
- Rails 8.0.2
- Kamal gem installed: `gem install kamal`
- SSH key-based access to your server

### Production Server
- Ubuntu 22.04 LTS (recommended)
- Docker installed
- PostgreSQL 15+ installed
- Minimum 2GB RAM
- 20GB+ storage
- Valid domain name pointing to server IP

## Initial Setup

### 1. Install Kamal

```bash
gem install kamal
```

### 2. Configure Secrets

Create `.kamal/secrets` file (git-ignored):

```bash
mkdir -p .kamal
touch .kamal/secrets
chmod 600 .kamal/secrets
```

Add to `.kamal/secrets`:
```
KAMAL_REGISTRY_PASSWORD=your-docker-hub-token
RAILS_MASTER_KEY=your-rails-master-key
DATABASE_URL=postgresql://user:password@host/bos_production
```

Get your Rails master key from `config/master.key`.

### 3. Update Deploy Configuration

Edit `config/deploy.yml`:

```yaml
service: bos
image: your-dockerhub-username/bos

servers:
  web:
    - your.server.ip.address

proxy:
  ssl: true
  host: your-domain.com

registry:
  username: your-dockerhub-username
  password:
    - KAMAL_REGISTRY_PASSWORD

env:
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
  clear:
    SOLID_QUEUE_IN_PUMA: true
    RAILS_LOG_LEVEL: info
    RAILS_SERVE_STATIC_FILES: true

volumes:
  - "bos_storage:/rails/storage"

asset_path: /rails/public/assets
```

### 4. Database Setup

On your production server:

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE USER bos_user WITH PASSWORD 'secure_password';
CREATE DATABASE bos_production OWNER bos_user;
\q

# Update PostgreSQL to accept connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host bos_production bos_user 127.0.0.1/32 md5

sudo systemctl restart postgresql
```

## Deployment Process

### First-Time Deployment

1. **Setup server dependencies:**
```bash
kamal setup
```

2. **Push environment variables:**
```bash
kamal env push
```

3. **Deploy the application:**
```bash
kamal deploy
```

4. **Run database migrations:**
```bash
kamal app exec 'bin/rails db:migrate'
```

5. **Create initial admin user:**
```bash
kamal console
# In Rails console:
User.create!(
  name: "Admin User",
  email: "admin@example.com",
  password: "secure_password",
  role: :owner
)
exit
```

### Subsequent Deployments

For updates after code changes:

```bash
# Standard deployment
kamal deploy

# If migrations are needed
kamal app exec 'bin/rails db:migrate'

# Skip health checks (use cautiously)
kamal deploy --skip-health-check
```

### Zero-Downtime Deployments

Kamal performs zero-downtime deployments by default:
1. Builds new container
2. Starts new container
3. Health checks pass
4. Routes traffic to new container
5. Stops old container

## Monitoring & Maintenance

### View Logs

```bash
# Application logs
kamal logs

# Follow logs
kamal logs -f

# Logs from specific container
kamal logs --container web

# System logs on server
ssh user@server
docker logs bos-web-latest
```

### Access Rails Console

```bash
kamal console
# or
kamal app exec --interactive 'bin/rails console'
```

### Database Console

```bash
kamal dbc
# or
kamal app exec --interactive 'bin/rails dbconsole'
```

### Server Shell Access

```bash
kamal shell
# or
kamal app exec --interactive 'bash'
```

### Health Checks

The application exposes `/up` endpoint for health checks:
```bash
curl https://your-domain.com/up
```

## SSL Configuration

Kamal Proxy handles SSL automatically via Let's Encrypt:
1. Ensure domain points to server IP
2. Set `proxy.ssl: true` in deploy.yml
3. Set `proxy.host: your-domain.com`
4. Deploy normally

For Cloudflare users:
- Set SSL/TLS encryption mode to "Full"
- Disable "Always Use HTTPS" (Kamal handles redirects)

## Environment Variables

### Required Variables
- `RAILS_MASTER_KEY` - Decrypts credentials
- `DATABASE_URL` - PostgreSQL connection string

### Optional Variables
- `SOLID_QUEUE_IN_PUMA` - Run jobs in web process (default: true)
- `JOB_CONCURRENCY` - Number of job workers (default: 1)
- `WEB_CONCURRENCY` - Number of Puma workers (default: 1)
- `RAILS_LOG_LEVEL` - Logging verbosity (default: info)

## Asset Handling

Assets are compiled during Docker build:
1. Precompilation happens in Dockerfile
2. Served by Rails in production (RAILS_SERVE_STATIC_FILES=true)
3. Consider CDN for high traffic

To manually compile assets:
```bash
kamal app exec 'bin/rails assets:precompile'
```

## Backup Strategy

### Database Backups

Create backup script on server:
```bash
#!/bin/bash
# /home/deploy/backup_db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U bos_user -h localhost bos_production > /backups/bos_$DATE.sql
# Keep only last 7 days
find /backups -name "bos_*.sql" -mtime +7 -delete
```

Schedule with cron:
```bash
crontab -e
0 2 * * * /home/deploy/backup_db.sh
```

### Application Data

Persistent data in Docker volume:
```bash
# Backup volume
docker run --rm -v bos_storage:/data -v /backups:/backup \
  ubuntu tar czf /backup/bos_storage_$(date +%Y%m%d).tar.gz -C /data .
```

## Troubleshooting

### Common Issues

1. **Deploy fails with health check**
```bash
# Check container logs
kamal logs --container web-latest

# Deploy without health check
kamal deploy --skip-health-check
```

2. **Database connection errors**
```bash
# Verify DATABASE_URL
kamal env push
kamal app exec 'echo $DATABASE_URL'

# Test connection
kamal app exec 'bin/rails db:version'
```

3. **Asset compilation errors**
```bash
# Clear cache and retry
kamal app exec 'bin/rails tmp:clear'
kamal app exec 'bin/rails assets:clobber'
kamal deploy
```

4. **SSL certificate issues**
```bash
# Check Kamal proxy
docker ps | grep kamal-proxy
docker logs kamal-proxy

# Restart proxy
kamal proxy reboot
```

### Rollback Procedure

If deployment fails:
```bash
# List available versions
kamal app versions

# Rollback to previous version
kamal rollback [version]
```

## Performance Tuning

### Puma Configuration

Adjust in `config/puma.rb`:
```ruby
workers ENV.fetch("WEB_CONCURRENCY", 1)
threads 5, 5
preload_app!
```

### Database Connection Pool

In `config/database.yml`:
```yaml
production:
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5) %>
```

### Memory Optimization

Monitor memory usage:
```bash
kamal app exec 'ps aux | grep puma'
```

Adjust if needed:
```yaml
# deploy.yml
env:
  clear:
    MALLOC_ARENA_MAX: 2
    RUBY_GC_HEAP_GROWTH_FACTOR: 1.1
```

## Security Checklist

- [ ] Strong database password
- [ ] Rails master key secured
- [ ] SSH key-only server access
- [ ] Firewall configured (ufw)
- [ ] Regular security updates
- [ ] Fail2ban installed
- [ ] Database backups encrypted
- [ ] Environment variables not in logs

## Scaling Considerations

### Horizontal Scaling

To add more web servers:
```yaml
servers:
  web:
    - server1.example.com
    - server2.example.com
```

### Separate Job Processing

For dedicated job server:
```yaml
servers:
  web:
    - web.example.com
  job:
    hosts:
      - job.example.com
    cmd: bin/jobs
```

### Load Balancing

For multiple servers:
1. Remove `proxy` section from deploy.yml
2. Use external load balancer (nginx, HAProxy)
3. Terminate SSL at load balancer

## Maintenance Mode

To enable maintenance mode:
```bash
# Create maintenance file
kamal app exec 'touch /rails/public/maintenance.html'

# Remove when done
kamal app exec 'rm /rails/public/maintenance.html'
```

## Useful Kamal Commands

```bash
kamal setup          # Initial server setup
kamal deploy         # Deploy new version
kamal redeploy       # Force fresh deployment
kamal rollback       # Rollback to previous
kamal logs           # View application logs
kamal console        # Rails console
kamal shell          # Container shell
kamal env push       # Update environment
kamal audit          # Check configuration
kamal app exec CMD   # Run command in container
kamal proxy reboot   # Restart Kamal proxy
kamal version        # Show current version
```

## Support Resources

- [Kamal Documentation](https://kamal-deploy.org)
- [Rails Deployment Guide](https://guides.rubyonrails.org/configuring.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com)

Remember to test deployments in a staging environment first!