#!/usr/bin/env node

/**
 * Debug Migration Analysis Tool
 * 
 * This tool provides comprehensive analysis of debug function usage patterns
 * to help developers plan and prioritize their migration from the legacy
 * 19-namespace system to the new 6-category system.
 * 
 * Features:
 * - Deep analysis of debug function usage patterns
 * - Migration complexity assessment
 * - Priority recommendations for migration order
 * - Dependency impact analysis
 * - Performance impact estimation
 * - Generated migration roadmap
 */

const fs = require('fs');
const path = require('path');

// Import migration mappings
const { MIGRATION_MAP, LEGACY_FUNCTIONS } = require('./migrate-debug-calls');

class DebugMigrationAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.analysis = {
      overview: {},
      fileAnalysis: [],
      categoryBreakdown: {},
      complexityAssessment: {},
      migrationPriority: [],
      recommendations: {},
      timeline: {}
    };
  }

  /**
   * Run comprehensive analysis
   */
  async runFullAnalysis() {
    console.log('🔍 Running comprehensive debug migration analysis...\n');

    // 1. Basic usage analysis
    await this.analyzeUsagePatterns();
    
    // 2. Category breakdown analysis
    await this.analyzeCategoryBreakdown();
    
    // 3. Complexity assessment
    await this.assessMigrationComplexity();
    
    // 4. Priority analysis
    await this.analyzeMigrationPriority();
    
    // 5. Generate recommendations
    await this.generateRecommendations();
    
    // 6. Create timeline
    await this.generateMigrationTimeline();

    // Display results
    this.displayComprehensiveResults();

    // Save detailed report
    await this.saveAnalysisReport();

    return this.analysis;
  }

  /**
   * Analyze usage patterns across the codebase
   */
  async analyzeUsagePatterns() {
    const scanDirs = ['frontend/src', 'frontend/tests', 'scripts'];
    const fileExtensions = ['.js', '.ts', '.svelte'];
    
    this.analysis.overview = {
      totalFiles: 0,
      filesWithDebug: 0,
      totalDebugCalls: 0,
      functionUsage: {},
      hotspots: []
    };

    // Initialize function usage tracking  
    LEGACY_FUNCTIONS.forEach(func => {
      this.analysis.overview.functionUsage[func] = { 
        count: 0, 
        files: [],
        variants: { basic: 0, warn: 0, error: 0 }
      };
    });

    for (const dir of scanDirs) {
      const fullPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(fullPath)) {
        await this.scanDirectoryRecursive(fullPath);
      }
    }
  }

  /**
   * Recursively scan directories
   */
  async scanDirectoryRecursive(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.scanDirectoryRecursive(fullPath);
      } else if (entry.isFile() && this.shouldProcessFile(entry.name)) {
        await this.analyzeFileDetailed(fullPath);
      }
    }
  }

  /**
   * Check if file should be processed
   */
  shouldProcessFile(filename) {
    const extensions = ['.js', '.ts', '.svelte'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Detailed file analysis
   */
  async analyzeFileDetailed(filePath) {
    this.analysis.overview.totalFiles++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);
      
      const fileAnalysis = {
        path: relativePath,
        size: content.length,
        debugCalls: [],
        imports: [],
        complexity: 'simple',
        migrationEffort: 'low',
        dependencies: [],
        testFile: relativePath.includes('test') || relativePath.includes('spec'),
        category: this.categorizeFile(relativePath)
      };

      // Analyze imports
      this.analyzeImports(content, fileAnalysis);
      
      // Analyze debug calls
      let totalCallsInFile = 0;
      const functionCounts = {};
      
      LEGACY_FUNCTIONS.forEach(func => {
        const callAnalysis = this.analyzeFunctionCalls(content, func);
        
        if (callAnalysis.total > 0) {
          functionCounts[func] = callAnalysis;
          totalCallsInFile += callAnalysis.total;
          
          // Update overview
          this.analysis.overview.functionUsage[func].count += callAnalysis.total;
          this.analysis.overview.functionUsage[func].files.push(relativePath);
          this.analysis.overview.functionUsage[func].variants.basic += callAnalysis.basic;
          this.analysis.overview.functionUsage[func].variants.warn += callAnalysis.warn;
          this.analysis.overview.functionUsage[func].variants.error += callAnalysis.error;
        }
      });

      if (totalCallsInFile > 0) {
        this.analysis.overview.filesWithDebug++;
        this.analysis.overview.totalDebugCalls += totalCallsInFile;
        
        fileAnalysis.debugCalls = functionCounts;
        fileAnalysis.totalCalls = totalCallsInFile;
        
        // Assess complexity
        fileAnalysis.complexity = this.assessFileComplexity(fileAnalysis);
        fileAnalysis.migrationEffort = this.assessMigrationEffort(fileAnalysis);
        
        this.analysis.fileAnalysis.push(fileAnalysis);
        
        // Identify hotspots
        if (totalCallsInFile >= 10) {
          this.analysis.overview.hotspots.push({
            file: relativePath,
            calls: totalCallsInFile,
            functions: Object.keys(functionCounts).length
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Warning: Could not analyze ${filePath}: ${error.message}`);
    }
  }

  /**
   * Analyze imports in file
   */
  analyzeImports(content, fileAnalysis) {
    const importRegex = /import\s+{([^}]*)}\s+from\s+(['"][^'"]*debug[^'"]*['"])/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1].split(',').map(imp => imp.trim());
      fileAnalysis.imports.push({
        raw: match[0],
        functions: imports,
        legacyCount: imports.filter(imp => LEGACY_FUNCTIONS.includes(imp)).length
      });
    }
  }

  /**
   * Analyze function calls for specific function
   */
  analyzeFunctionCalls(content, func) {
    const patterns = {
      basic: new RegExp(`\\b${func}\\s*\\(`, 'g'),
      warn: new RegExp(`\\b${func}\\.warn\\s*\\(`, 'g'),
      error: new RegExp(`\\b${func}\\.error\\s*\\(`, 'g')
    };

    const results = {
      basic: (content.match(patterns.basic) || []).length,
      warn: (content.match(patterns.warn) || []).length,
      error: (content.match(patterns.error) || []).length,
      total: 0
    };

    results.total = results.basic + results.warn + results.error;
    return results;
  }

  /**
   * Categorize file by its path and content
   */
  categorizeFile(filePath) {
    if (filePath.includes('test') || filePath.includes('spec')) return 'test';
    if (filePath.includes('api/')) return 'api';
    if (filePath.includes('components/')) return 'component';
    if (filePath.includes('stores/')) return 'store';
    if (filePath.includes('utils/')) return 'utility';
    if (filePath.includes('services/')) return 'service';
    if (filePath.includes('models/')) return 'model';
    return 'other';
  }

  /**
   * Assess file complexity for migration
   */
  assessFileComplexity(fileAnalysis) {
    const totalCalls = fileAnalysis.totalCalls;
    const uniqueFunctions = Object.keys(fileAnalysis.debugCalls).length;
    const hasVariants = Object.values(fileAnalysis.debugCalls).some(calls => 
      calls.warn > 0 || calls.error > 0
    );

    if (totalCalls > 15 || uniqueFunctions > 8 || (hasVariants && totalCalls > 8)) {
      return 'complex';
    } else if (totalCalls > 8 || uniqueFunctions > 4 || hasVariants) {
      return 'moderate';
    }
    
    return 'simple';
  }

  /**
   * Assess migration effort for file
   */
  assessMigrationEffort(fileAnalysis) {
    const complexity = fileAnalysis.complexity;
    const isTestFile = fileAnalysis.testFile;
    const multipleImports = fileAnalysis.imports.length > 1;
    
    if (complexity === 'complex' || (multipleImports && !isTestFile)) {
      return 'high';
    } else if (complexity === 'moderate' || multipleImports) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Analyze breakdown by target categories
   */
  async analyzeCategoryBreakdown() {
    this.analysis.categoryBreakdown = {
      network: { functions: [], totalCalls: 0, files: new Set() },
      data: { functions: [], totalCalls: 0, files: new Set() },
      ui: { functions: [], totalCalls: 0, files: new Set() },
      business: { functions: [], totalCalls: 0, files: new Set() },
      monitor: { functions: [], totalCalls: 0, files: new Set() }
    };

    // Map legacy functions to their target categories
    Object.entries(MIGRATION_MAP).forEach(([legacyFunc, mapping]) => {
      const categoryName = mapping.category.replace('debug', '').toLowerCase();
      const usage = this.analysis.overview.functionUsage[legacyFunc];
      
      if (usage.count > 0) {
        this.analysis.categoryBreakdown[categoryName].functions.push({
          name: legacyFunc,
          calls: usage.count,
          files: usage.files.length,
          targetMethod: mapping.method
        });
        
        this.analysis.categoryBreakdown[categoryName].totalCalls += usage.count;
        usage.files.forEach(file => {
          this.analysis.categoryBreakdown[categoryName].files.add(file);
        });
      }
    });

    // Convert file sets to counts
    Object.keys(this.analysis.categoryBreakdown).forEach(category => {
      this.analysis.categoryBreakdown[category].uniqueFiles = 
        this.analysis.categoryBreakdown[category].files.size;
      delete this.analysis.categoryBreakdown[category].files; // Remove Set for JSON serialization
    });
  }

  /**
   * Assess overall migration complexity
   */
  async assessMigrationComplexity() {
    const overview = this.analysis.overview;
    const fileAnalysis = this.analysis.fileAnalysis;
    
    this.analysis.complexityAssessment = {
      overall: 'low',
      factors: {
        totalCalls: overview.totalDebugCalls,
        affectedFiles: overview.filesWithDebug,
        complexFiles: fileAnalysis.filter(f => f.complexity === 'complex').length,
        hotspots: overview.hotspots.length,
        testFilesCoverage: fileAnalysis.filter(f => f.testFile).length
      },
      risks: [],
      mitigations: []
    };

    const factors = this.analysis.complexityAssessment.factors;
    
    // Assess overall complexity
    if (factors.totalCalls > 100 || factors.affectedFiles > 25 || factors.complexFiles > 5) {
      this.analysis.complexityAssessment.overall = 'high';
    } else if (factors.totalCalls > 50 || factors.affectedFiles > 15 || factors.complexFiles > 2) {
      this.analysis.complexityAssessment.overall = 'moderate';
    }

    // Identify risks
    if (factors.hotspots > 3) {
      this.analysis.complexityAssessment.risks.push('Multiple hotspot files with heavy debug usage');
    }
    
    if (factors.testFilesCoverage < factors.affectedFiles * 0.3) {
      this.analysis.complexityAssessment.risks.push('Low test coverage for debug functionality');
    }
    
    if (factors.complexFiles / factors.affectedFiles > 0.2) {
      this.analysis.complexityAssessment.risks.push('High proportion of complex files requiring migration');
    }

    // Suggest mitigations
    if (this.analysis.complexityAssessment.overall === 'high') {
      this.analysis.complexityAssessment.mitigations.push('Migrate in small batches (5-10 files per batch)');
      this.analysis.complexityAssessment.mitigations.push('Start with simple files to build confidence');
      this.analysis.complexityAssessment.mitigations.push('Create comprehensive test suite before migration');
    }
  }

  /**
   * Analyze migration priority order
   */
  async analyzeMigrationPriority() {
    const fileAnalysis = this.analysis.fileAnalysis;
    
    // Score files based on various factors
    const scoredFiles = fileAnalysis.map(file => {
      let score = 0;
      
      // Complexity (lower complexity = higher priority for early migration)
      if (file.complexity === 'simple') score += 30;
      else if (file.complexity === 'moderate') score += 20;
      else score += 10;
      
      // Test files get higher priority
      if (file.testFile) score += 25;
      
      // Files with many calls get higher priority
      score += Math.min(file.totalCalls * 2, 20);
      
      // Utility files get higher priority
      if (file.category === 'utility') score += 15;
      else if (file.category === 'service') score += 10;
      
      // Files with fewer unique functions are easier
      const uniqueFunctions = Object.keys(file.debugCalls).length;
      score += Math.max(10 - uniqueFunctions, 0);
      
      return {
        ...file,
        migrationScore: score
      };
    });

    // Sort by migration score (higher score = higher priority)
    this.analysis.migrationPriority = scoredFiles
      .sort((a, b) => b.migrationScore - a.migrationScore)
      .map((file, index) => ({
        rank: index + 1,
        file: file.path,
        score: file.migrationScore,
        effort: file.migrationEffort,
        complexity: file.complexity,
        calls: file.totalCalls,
        category: file.category,
        rationale: this.generatePriorityRationale(file)
      }));
  }

  /**
   * Generate rationale for priority ranking
   */
  generatePriorityRationale(file) {
    const reasons = [];
    
    if (file.complexity === 'simple') reasons.push('simple complexity');
    if (file.testFile) reasons.push('test file (safer to migrate)');
    if (file.totalCalls >= 10) reasons.push('high debug usage');
    if (file.category === 'utility') reasons.push('utility file (good foundation)');
    if (Object.keys(file.debugCalls).length <= 3) reasons.push('few unique functions');
    
    return reasons.join(', ');
  }

  /**
   * Generate migration recommendations
   */
  async generateRecommendations() {
    const complexity = this.analysis.complexityAssessment.overall;
    const categoryBreakdown = this.analysis.categoryBreakdown;
    const priority = this.analysis.migrationPriority;
    
    this.analysis.recommendations = {
      strategy: '',
      phases: [],
      focus: [],
      cautions: []
    };

    // Strategy recommendation
    if (complexity === 'high') {
      this.analysis.recommendations.strategy = 'Gradual migration with extensive testing';
    } else if (complexity === 'moderate') {
      this.analysis.recommendations.strategy = 'Phased migration by category';
    } else {
      this.analysis.recommendations.strategy = 'Comprehensive migration';
    }

    // Phase recommendations
    const topPriorityFiles = priority.slice(0, Math.min(10, Math.ceil(priority.length * 0.3)));
    const mediumPriorityFiles = priority.slice(topPriorityFiles.length, Math.ceil(priority.length * 0.7));
    const lowPriorityFiles = priority.slice(topPriorityFiles.length + mediumPriorityFiles.length);

    this.analysis.recommendations.phases = [
      {
        name: 'Phase 1: Foundation (High Priority)',
        files: topPriorityFiles.length,
        description: 'Migrate simple files and utilities to establish patterns',
        duration: '1-2 days'
      },
      {
        name: 'Phase 2: Core Implementation (Medium Priority)', 
        files: mediumPriorityFiles.length,
        description: 'Migrate main application logic and components',
        duration: '3-5 days'
      },
      {
        name: 'Phase 3: Complex Cases (Low Priority)',
        files: lowPriorityFiles.length,
        description: 'Handle complex files and edge cases',
        duration: '2-3 days'
      }
    ];

    // Focus areas
    const topCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b.totalCalls - a.totalCalls)
      .slice(0, 3);
    
    this.analysis.recommendations.focus = topCategories.map(([category, data]) => ({
      category: category,
      priority: 'high',
      calls: data.totalCalls,
      files: data.uniqueFiles,
      reason: `Highest usage with ${data.totalCalls} calls across ${data.uniqueFiles} files`
    }));

    // Cautions
    const hotspots = this.analysis.overview.hotspots;
    if (hotspots.length > 0) {
      this.analysis.recommendations.cautions.push(
        `Handle hotspot files carefully: ${hotspots.slice(0, 3).map(h => h.file).join(', ')}`
      );
    }
    
    const complexFiles = this.analysis.fileAnalysis.filter(f => f.complexity === 'complex');
    if (complexFiles.length > 0) {
      this.analysis.recommendations.cautions.push(
        `${complexFiles.length} complex files require extra attention and testing`
      );
    }
  }

  /**
   * Generate migration timeline
   */
  async generateMigrationTimeline() {
    const totalFiles = this.analysis.migrationPriority.length;
    const complexity = this.analysis.complexityAssessment.overall;
    
    let estimatedDays;
    if (complexity === 'high') {
      estimatedDays = Math.ceil(totalFiles * 0.5); // 2 files per day
    } else if (complexity === 'moderate') {
      estimatedDays = Math.ceil(totalFiles * 0.3); // ~3 files per day
    } else {
      estimatedDays = Math.ceil(totalFiles * 0.2); // 5 files per day
    }

    this.analysis.timeline = {
      estimatedDuration: `${estimatedDays} days`,
      phases: this.analysis.recommendations.phases,
      milestones: [
        { day: Math.ceil(estimatedDays * 0.3), milestone: 'Phase 1 Complete - Foundation established' },
        { day: Math.ceil(estimatedDays * 0.7), milestone: 'Phase 2 Complete - Core migration done' },
        { day: estimatedDays, milestone: 'Phase 3 Complete - Migration finished' }
      ],
      dailyTargets: {
        simple: Math.floor(10 / estimatedDays) || 1,
        moderate: Math.floor(5 / estimatedDays) || 1,  
        complex: Math.floor(2 / estimatedDays) || 1
      }
    };
  }

  /**
   * Display comprehensive results
   */
  displayComprehensiveResults() {
    console.log('📊 Comprehensive Debug Migration Analysis');
    console.log('=========================================\n');

    // Overview
    const overview = this.analysis.overview;
    console.log('📋 Overview:');
    console.log(`   Total files scanned: ${overview.totalFiles}`);
    console.log(`   Files with debug calls: ${overview.filesWithDebug}`);
    console.log(`   Total debug calls: ${overview.totalDebugCalls}`);
    console.log(`   Migration complexity: ${this.analysis.complexityAssessment.overall.toUpperCase()}`);
    console.log(`   Estimated duration: ${this.analysis.timeline.estimatedDuration}\n`);

    // Category breakdown
    console.log('🎯 Migration Target Categories:');
    Object.entries(this.analysis.categoryBreakdown).forEach(([category, data]) => {
      if (data.totalCalls > 0) {
        console.log(`   ${category.padEnd(10)} | ${String(data.totalCalls).padStart(3)} calls | ${String(data.uniqueFiles).padStart(2)} files`);
      }
    });
    console.log('');

    // Top priority files
    console.log('⭐ Top 10 Priority Files for Migration:');
    this.analysis.migrationPriority.slice(0, 10).forEach((item, index) => {
      console.log(`   ${String(index + 1).padStart(2)}. ${item.file.padEnd(40)} (${item.calls} calls, ${item.effort} effort)`);
    });
    console.log('');

    // Recommendations
    console.log('💡 Migration Strategy:');
    console.log(`   ${this.analysis.recommendations.strategy}\n`);
    
    console.log('📅 Recommended Phases:');
    this.analysis.recommendations.phases.forEach((phase, index) => {
      console.log(`   ${index + 1}. ${phase.name}`);
      console.log(`      Files: ${phase.files} | Duration: ${phase.duration}`);
      console.log(`      ${phase.description}\n`);
    });

    // Cautions
    if (this.analysis.recommendations.cautions.length > 0) {
      console.log('⚠️  Important Cautions:');
      this.analysis.recommendations.cautions.forEach(caution => {
        console.log(`   • ${caution}`);
      });
      console.log('');
    }

    console.log('🚀 Ready to start migration!');
    console.log('   Run: node scripts/migrate-debug-calls.js migrate');
    console.log('   Or:  node scripts/migrate-debug-calls.js migrate <specific-file>');
  }

  /**
   * Save detailed analysis report
   */
  async saveAnalysisReport() {
    const reportPath = path.join(this.projectRoot, 'debug-migration-analysis-report.json');
    
    const report = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      ...this.analysis
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed analysis report saved to: ${path.relative(process.cwd(), reportPath)}`);
    
    // Also save a simplified CSV for easy viewing
    const csvPath = path.join(this.projectRoot, 'debug-migration-priority.csv');
    const csvContent = this.generatePriorityCSV();
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`📊 Priority CSV saved to: ${path.relative(process.cwd(), csvPath)}`);
  }

  /**
   * Generate CSV of migration priorities
   */
  generatePriorityCSV() {
    const headers = ['Rank', 'File', 'Calls', 'Effort', 'Complexity', 'Category', 'Rationale'];
    const rows = this.analysis.migrationPriority.map(item => [
      item.rank,
      item.file,
      item.calls,
      item.effort,
      item.complexity,
      item.category,
      `"${item.rationale}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Main execution
async function main() {
  console.log('🔬 Debug Migration Comprehensive Analyzer');
  console.log('==========================================\n');

  try {
    const analyzer = new DebugMigrationAnalyzer();
    await analyzer.runFullAnalysis();
  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { DebugMigrationAnalyzer };