# GitHub Integration Setup

To enable the bug report and feature request functionality, you need to configure GitHub credentials:

## 1. Create a GitHub Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "bŏs Bug Report Integration"
4. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `write:issues` (Write access to issues)
5. Generate the token and copy it

## 2. Add Credentials to Rails

Run the following command to edit your credentials:

```bash
rails credentials:edit
```

Add the following configuration:

```yaml
git_token: your_personal_access_token_here
git_repo: owner/repository # e.g., "fluffyx/bos"
```

## 3. Create GitHub Labels

The system expects these labels to exist in your repository:

- `bug` - For bug reports
- `feature-request` - For feature requests
- `auto-fix` - For bugs eligible for automation
- `claude-processing` - Currently being fixed by Claude
- `pr-created` - PR has been created
- `needs-review` - Feature requests awaiting review
- `story-generated` - Story has been created

You can create these manually in your GitHub repository settings or use the GitHub CLI:

```bash
gh label create bug --description "Bug reports" --color "d73a4a"
gh label create feature-request --description "Feature requests" --color "a2eeef"
gh label create auto-fix --description "Eligible for automated fix" --color "0075ca"
gh label create claude-processing --description "Being processed by Claude" --color "ffcc00"
gh label create pr-created --description "PR has been created" --color "0e8a16"
gh label create needs-review --description "Awaiting review" --color "d4c5f9"
gh label create story-generated --description "Story has been generated" --color "c5def5"
```

## 4. Test the Integration

1. Bundle install to get the Octokit gem: `bundle install`
2. Restart your Rails server
3. Click on your user menu
4. Try "Report a Bug" or "Request a Feature"

## Environment Variables (Alternative)

If you prefer to use environment variables instead of Rails credentials:

```bash
export GIT_TOKEN="your_token_here"
export GIT_REPO="owner/repository"
```

Then update the controller to use `ENV["GIT_TOKEN"]` and `ENV["GIT_REPO"]`.