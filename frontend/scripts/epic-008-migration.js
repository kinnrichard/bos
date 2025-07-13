#!/usr/bin/env node

/**
 * Epic-008 Migration Analysis CLI
 * 
 * Command-line tool for analyzing and planning the Epic-008 migration.
 * 
 * Usage:
 *   node scripts/epic-008-migration.js analyze    # Run migration analysis
 *   node scripts/epic-008-migration.js report     # Generate detailed report
 *   node scripts/epic-008-migration.js validate   # Validate current migration state
 *   node scripts/epic-008-migration.js help       # Show this help
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple migration analysis (Node.js version)
 * This is a simplified version that doesn't require TypeScript compilation
 */
class SimpleMigrationAnalysis {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.sourceDir = path.join(this.projectRoot, 'src');
  }

  async analyzeUsage() {
    console.log('🔍 Analyzing current Task model usage...\n');
    
    const files = await this.findRelevantFiles();
    console.log(`Found ${files.length} files to analyze\n`);

    let totalIssues = 0;
    const issuesByFile = [];

    for (const filePath of files) {
      const issues = await this.analyzeFile(filePath);
      if (issues.length > 0) {
        totalIssues += issues.length;
        issuesByFile.push({ filePath, issues });
      }
    }

    console.log(`📊 Analysis Results:`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Files with issues: ${issuesByFile.length}`);
    console.log(`   Total issues found: ${totalIssues}\n`);

    if (issuesByFile.length > 0) {
      console.log(`🚨 Files requiring migration:\n`);
      issuesByFile.forEach(({ filePath, issues }) => {
        const relativePath = path.relative(this.projectRoot, filePath);
        console.log(`   📄 ${relativePath}`);
        issues.forEach(issue => {
          console.log(`      ⚠️  ${issue}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No migration issues found!');
    }

    return { totalFiles: files.length, filesWithIssues: issuesByFile.length, totalIssues };
  }

  async findRelevantFiles() {
    const files = [];
    const searchDirs = [
      path.join(this.sourceDir, 'lib'),
      path.join(this.sourceDir, 'components'), 
      path.join(this.sourceDir, 'routes'),
      path.join(this.sourceDir, 'stores')
    ];

    for (const dir of searchDirs) {
      try {
        await this.findFilesRecursive(dir, files, ['.ts', '.js', '.svelte']);
      } catch (error) {
        // Directory might not exist
      }
    }

    return files;
  }

  async findFilesRecursive(dir, files, extensions) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.findFilesRecursive(fullPath, files, extensions);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const issues = [];

      // Check for old import patterns
      const oldImports = [
        { pattern: /import.*from.*['"`].*\/models\/generated\/task['"`]/g, issue: 'Uses old generated task import' },
        { pattern: /import.*TaskType.*from/g, issue: 'Uses TaskType (should be TaskData)' },
        { pattern: /import.*ModelFactory.*from/g, issue: 'Uses deprecated ModelFactory' },
        { pattern: /import.*RecordInstance.*from/g, issue: 'Uses deprecated RecordInstance' }
      ];

      oldImports.forEach(({ pattern, issue }) => {
        if (pattern.test(content)) {
          issues.push(issue);
        }
      });

      // Check for old usage patterns
      const oldUsage = [
        { pattern: /Task\.find\([^)]+\)(?!\s*\.then)(?!\s*await)/g, issue: 'Task.find() calls need await' },
        { pattern: /\.createActiveModel/g, issue: 'createActiveModel is deprecated' },
        { pattern: /\.createReactiveModel/g, issue: 'createReactiveModel is deprecated' }
      ];

      oldUsage.forEach(({ pattern, issue }) => {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          issues.push(`${issue} (${matches.length} occurrences)`);
        }
      });

      return issues;
    } catch (error) {
      return [`Failed to read file: ${error.message}`];
    }
  }

  async generateReport() {
    console.log('📋 Generating Epic-008 Migration Report...\n');
    
    const analysisResult = await this.analyzeUsage();
    
    const report = `
# Epic-008 Migration Report
Generated: ${new Date().toISOString()}

## Summary
- Total files analyzed: ${analysisResult.totalFiles}
- Files requiring migration: ${analysisResult.filesWithIssues}
- Total issues found: ${analysisResult.totalIssues}

## Migration Status
${analysisResult.totalIssues === 0 ? '✅ Ready for Epic-008!' : '⚠️ Migration required'}

## Next Steps
${analysisResult.totalIssues === 0 
  ? '1. Run validation to ensure all Epic-008 files are in place\n2. Begin gradual rollout of new model system'
  : '1. Review files listed above\n2. Update imports to use $models\n3. Add await to Task.find() calls\n4. Replace TaskType with TaskData\n5. Test reactive functionality'
}

## Key Benefits After Migration
- 60%+ code reduction (removal of 4 competing patterns)
- Rails-like ActiveRecord API familiarity
- Svelte 5 reactive integration
- Type-safe CRUD operations
- Simplified mental model

## Support
- See /src/lib/models/index.ts for usage examples
- Check Epic-008 documentation for detailed migration guide
- Use migration utilities in /src/lib/models/migration/
    `;

    const reportPath = path.join(this.projectRoot, 'EPIC-008-MIGRATION-REPORT.md');
    await fs.writeFile(reportPath, report.trim());
    
    console.log('📄 Report saved to: EPIC-008-MIGRATION-REPORT.md');
    return report;
  }

  async validateMigration() {
    console.log('✅ Validating Epic-008 migration state...\n');
    
    const errors = [];
    
    // Check foundation files
    const foundationFiles = [
      'src/lib/models/base/types.ts',
      'src/lib/models/base/active-record.ts',
      'src/lib/models/base/reactive-record.ts'
    ];

    console.log('Checking foundation classes...');
    for (const file of foundationFiles) {
      const fullPath = path.join(this.projectRoot, file);
      try {
        await fs.access(fullPath);
        console.log(`  ✅ ${file}`);
      } catch {
        console.log(`  ❌ ${file}`);
        errors.push(`Missing foundation file: ${file}`);
      }
    }

    // Check Task model files
    const taskFiles = [
      'src/lib/models/types/task-data.ts',
      'src/lib/models/task.ts', 
      'src/lib/models/reactive-task.ts',
      'src/lib/models/index.ts'
    ];

    console.log('\nChecking Task model files...');
    for (const file of taskFiles) {
      const fullPath = path.join(this.projectRoot, file);
      try {
        await fs.access(fullPath);
        console.log(`  ✅ ${file}`);
      } catch {
        console.log(`  ❌ ${file}`);
        errors.push(`Missing Task model file: ${file}`);
      }
    }

    // Check svelte.config.js alias
    console.log('\nChecking import aliases...');
    try {
      const svelteConfigPath = path.join(this.projectRoot, 'svelte.config.js');
      const svelteConfig = await fs.readFile(svelteConfigPath, 'utf-8');
      if (svelteConfig.includes('$models:')) {
        console.log('  ✅ $models alias configured');
      } else {
        console.log('  ❌ $models alias not found');
        errors.push('$models alias not configured in svelte.config.js');
      }
    } catch (error) {
      console.log('  ❌ Could not check svelte.config.js');
      errors.push('Could not validate svelte.config.js');
    }

    console.log(`\n📊 Validation Results:`);
    if (errors.length === 0) {
      console.log('✅ Epic-008 migration infrastructure is ready!');
      console.log('\nNext steps:');
      console.log('1. Run TypeScript compilation: npm run typecheck');
      console.log('2. Test basic Task operations');
      console.log('3. Begin migrating existing usage');
    } else {
      console.log('❌ Validation failed with errors:');
      errors.forEach(error => console.log(`   - ${error}`));
    }

    return { success: errors.length === 0, errors };
  }
}

// CLI handler
async function main() {
  const command = process.argv[2];
  const migration = new SimpleMigrationAnalysis();

  try {
    switch (command) {
      case 'analyze':
        await migration.analyzeUsage();
        break;
      
      case 'report':
        await migration.generateReport();
        break;
      
      case 'validate':
        await migration.validateMigration();
        break;
      
      case 'help':
      default:
        console.log(`
Epic-008 Migration CLI

Usage:
  node scripts/epic-008-migration.js <command>

Commands:
  analyze    Analyze current codebase for migration requirements
  report     Generate detailed migration report (saves to EPIC-008-MIGRATION-REPORT.md)
  validate   Validate that Epic-008 infrastructure is properly set up
  help       Show this help message

Examples:
  node scripts/epic-008-migration.js analyze
  node scripts/epic-008-migration.js report
  node scripts/epic-008-migration.js validate
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}