# Claude Code Configuration

This directory contains configuration files for Claude Code integration with the DRY linting system.

## Files

### `hooks.json`
Configures Claude Code hooks to run shared linting system on file saves.

**Key Features:**
- **Post-save hook**: Runs linting immediately after Claude saves any file
- **Blocking behavior**: Prevents Claude from continuing if linting fails
- **File filtering**: Only runs on lintable file types (*.rb, *.js, *.ts, *.jsx, *.tsx, *.svelte)
- **Smart exclusions**: Skips node_modules, vendor, and build directories

### `settings.json`
Main Claude Code project settings with linting integration.

**Key Features:**
- **Shared configuration**: References `./scripts/lint-config.sh` for DRY setup
- **Context-aware**: Different settings for backend vs frontend
- **Integration**: Links to git hooks and npm scripts
- **Quality gates**: Enforces code standards before allowing workflow continuation

## How It Works

1. **Claude saves a file** → Post-save hook triggers
2. **Hook runs** → `./scripts/claude-lint-hook.sh <file>`
3. **Shared linting** → Uses same logic as git hooks and CI
4. **Result handling**:
   - ✅ **Linting passes**: Claude continues with next task
   - ❌ **Linting fails**: Claude workflow is blocked with clear error messages

## Usage Examples

### Manual Testing
```bash
# Test Claude hook on a file
./scripts/claude-lint-hook.sh app/models/user.rb

# Test with auto-fix
./scripts/claude-lint-hook.sh --auto-fix frontend/src/app.ts
```

### NPM Scripts Integration
```bash
# Use shared linting commands
npm run claude:lint <file>
npm run claude:lint:fix <file>
```

## Configuration Customization

### Disable hooks temporarily
Edit `hooks.json`:
```json
{
  "hooks": {
    "post-save": {
      "enabled": false
    }
  }
}
```

### Enable auto-fix on save
Edit `settings.json`:
```json
{
  "linting": {
    "autoFixOnSave": true
  }
}
```

### Adjust timeout
Edit `hooks.json`:
```json
{
  "hooks": {
    "post-save": {
      "timeout": 120000
    }
  }
}
```

## Troubleshooting

### Hook not triggering
1. Check `hooks.json` has `"enabled": true`
2. Verify file extension is in `filePatterns`
3. Ensure script is executable: `chmod +x scripts/claude-lint-hook.sh`

### Linting errors
1. Run manual fix: `npm run lint:fix`
2. Check specific file: `./scripts/shared-lint.sh <file>`
3. Debug configuration: `./scripts/shared-lint.sh --debug`

### Performance issues
1. Increase timeout in `hooks.json`
2. Check for large files in exclusion patterns
3. Verify working directories are correct

## Integration Benefits

- **Zero Duplication**: Same linting logic for git, Claude, CI, and manual use
- **Consistent Standards**: Identical rules across all contexts
- **Developer Experience**: Claude automatically follows project code standards
- **Quality Assurance**: Prevents Claude from creating non-compliant code
- **Workflow Efficiency**: Immediate feedback without manual intervention
EOF < /dev/null