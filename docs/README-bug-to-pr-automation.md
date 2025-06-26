# Bug-to-PR Automation Setup Guide

## Prerequisites

Before setting up the automation system, ensure you have:

1. **GitHub Personal Access Token** with permissions:
   - `repo` (full repository access)
   - `write:issues` (create and manage issues)
   - `write:pull_requests` (create PRs)

2. **Claude CLI** installed and configured:
   - Install Claude CLI from https://claude.ai/code
   - Login with your Anthropic account
   - Ensure you have API access

3. **GitHub Repository** properly configured:
   - Repository must exist (e.g., `fluffyx/bos`)
   - You must have write access

## Step-by-Step Setup

### 1. Environment Variables

Add these to your `.env.development` and `.env.production` files:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=fluffyx/bos  # or your repo name
GITHUB_WEBHOOK_SECRET=generate_a_random_secret_string

# Claude Configuration  
CLAUDE_API_KEY=your_claude_api_key  # if using API instead of CLI

# Automation Controls
BUG_AUTOMATION_ENABLED=true
FEATURE_EMAIL_NOTIFICATIONS=true

# Admin Email (for notifications)
ADMIN_EMAIL=admin@example.com
```

### 2. GitHub Repository Setup

#### Create Required Labels

Go to your GitHub repository settings and create these labels:

- `bug` (color: #d73a4a) - For bug reports
- `feature-request` (color: #0075ca) - For feature requests
- `auto-fix` (color: #7057ff) - Bugs eligible for automation
- `claude-processing` (color: #fbca04) - Currently being processed
- `claude-implementing` (color: #e99695) - Being implemented
- `pr-created` (color: #0e8a16) - PR has been created
- `needs-review` (color: #d876e3) - Awaiting review
- `story-generated` (color: #5319e7) - Story created
- `automation-failed` (color: #b60205) - Automation failed

#### Setup Webhook (for feature requests)

1. Go to Settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain.com/github/webhook`
3. Content type: `application/json`
4. Secret: Use the value from `GITHUB_WEBHOOK_SECRET`
5. Select events: "Issue comments"
6. Active: ✓

### 3. Update Rails Configuration

#### Update Gemfile

Add if not already present:
```ruby
gem 'octokit', '~> 8.0'  # GitHub API client
```

Run `bundle install`

#### Update credentials (optional)

Instead of environment variables, you can use Rails credentials:

```bash
rails credentials:edit
```

Add:
```yaml
github_token: your_token
github_repo: fluffyx/bos
github_webhook_secret: your_secret
```

### 4. Database Setup

No database changes needed! The system uses GitHub Issues for all storage.

### 5. Test the Setup

#### Test GitHub Connection

Run Rails console:
```bash
rails console
```

Test GitHub API:
```ruby
client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'])
repo = ENV['GITHUB_REPO']
issues = client.issues(repo)
puts "Found #{issues.count} issues"
```

#### Test Claude CLI

In terminal:
```bash
echo "Hello Claude" | claude --conversation-id test-123
```

Should return a response from Claude.

### 6. Configure Email (for notifications)

Update `config/environments/production.rb`:

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'smtp.gmail.com',
  port: 587,
  domain: 'your-domain.com',
  user_name: ENV['SMTP_USERNAME'],
  password: ENV['SMTP_PASSWORD'],
  authentication: 'plain',
  enable_starttls_auto: true
}
```

### 7. Deploy and Access

After deployment:

1. **For Users**: 
   - Click user menu → "🐛 Report a Bug" or "✨ Request a Feature"
   
2. **For Admins**:
   - Access dashboard at `/admin/automation_dashboard` (admin/owner only)
   - Monitor GitHub Issues for all reports
   - Use slash commands in issue comments:
     - `/generate-story` - Generate BMAD story
     - `/approve-implementation` - Start implementation
     - `/decline` - Close with explanation

### 8. Usage Flow

#### Bug Reports
1. User clicks "Report a Bug" → Screenshot captured automatically
2. User fills form → Creates GitHub Issue with "bug" label
3. Background job picks up issue → Sends to Claude
4. Claude analyzes and creates fix → Opens PR
5. PR links to issue with "Fixes #123"
6. Admin reviews and merges → Issue auto-closes

#### Feature Requests
1. User fills multi-step form → Creates GitHub Issue
2. Admin reviews in GitHub → Comments `/generate-story`
3. Claude generates BMAD story → Posts as comment
4. Admin approves → Comments `/approve-implementation`
5. Claude implements → Creates PR

### 9. Monitoring and Control

#### Admin Dashboard
- Visit `/admin/automation_dashboard`
- View statistics and recent issues
- Toggle automation on/off
- Enable/disable email notifications

#### Emergency Controls
Set environment variables:
- `BUG_AUTOMATION_ENABLED=false` - Disable bug automation
- `FEATURE_EMAIL_NOTIFICATIONS=false` - Disable emails

### 10. Troubleshooting

#### Common Issues

1. **GitHub API errors**
   - Check token permissions
   - Verify repo name format
   - Check rate limits

2. **Claude not responding**
   - Verify CLI is installed
   - Check conversation ID format
   - Ensure Claude has repo access

3. **Webhooks not working**
   - Verify webhook secret matches
   - Check webhook delivery logs in GitHub
   - Ensure HTTPS endpoint

4. **Screenshots failing**
   - Check browser console for errors
   - Verify html2canvas loaded
   - Check image size limits

#### Debug Mode

Enable detailed logging:
```ruby
# In config/environments/development.rb
config.log_level = :debug
```

Check logs:
```bash
tail -f log/development.log | grep -E "(GitHub|Claude|Automation)"
```

### 11. Security Considerations

1. **Never commit tokens** - Use environment variables
2. **Validate webhooks** - Always verify signatures
3. **Limit Claude access** - Read-only to start
4. **Rate limit** - Prevent abuse of bug reports
5. **Review all PRs** - Don't auto-merge

### 12. Next Steps

1. Test with a few beta users first
2. Monitor automation success rate
3. Adjust Claude prompts based on results
4. Consider adding more automation features
5. Set up alerts for failures

The system is now ready to automatically handle bug reports and feature requests!