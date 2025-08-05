# EP-0034: Email Reply Parser Integration

**Epic ID**: EP-0034  
**Created**: 2025-08-05  
**Status**: Open  
**Priority**: High  
**Component**: Backend/Email Processing  

## Overview

Implement PyCall-based integration with Mailgun's Talon library to extract the most recent message from email chains stored in PostgreSQL. This system will parse email bodies to separate replies from quoted content, signatures, and forwarded messages, supporting various email client formats and quoting styles.

## Business Value

- **Clean Email Display**: Show only the actual reply content, removing quoted text and signatures
- **Improved User Experience**: Cleaner email threads without redundant quoted content
- **Storage Efficiency**: Store parsed components separately for better data management
- **Analytics Ready**: Enable analysis of actual message content without noise
- **Multi-Client Support**: Handle emails from Gmail, Outlook, Apple Mail, and other clients
- **Future AI Integration**: Clean email data ready for AI/ML processing

## Requirements

### Core Functionality

1. **Email Parsing**
   - Extract reply text from email chains
   - Remove quoted content (various formats)
   - Extract and store signatures separately
   - Handle multiple email client formats
   - Support plain text emails (HTML in future)

2. **PyCall Integration**
   - Direct Python library calls from Ruby
   - No separate microservice required
   - Efficient memory management
   - Thread-safe implementation

3. **Database Integration**
   - Parse emails stored in PostgreSQL
   - Store parsed components separately
   - Background job processing
   - Batch processing capabilities

4. **Performance**
   - Parse emails asynchronously
   - Cache parsed results
   - Handle high volumes efficiently
   - Monitor parsing success rates

## Technical Design

### Architecture Overview

```
┌─────────────────────────┐
│    Email Creation       │
│  (Rails Controller)     │
└───────────┬─────────────┘
            │ after_create callback
            ▼
┌─────────────────────────┐
│  EmailParsingJob        │ ← Background processing
│  (ActiveJob/Sidekiq)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  TalonEmailParser       │ ← PyCall wrapper
│  (Service Object)       │
└───────────┬─────────────┘
            │ PyCall
            ▼
┌─────────────────────────┐
│  Talon Python Library   │ ← Email parsing logic
│  - quotations.extract   │
│  - signature.extract    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  PostgreSQL Database    │ ← Parsed data storage
│  emails table           │
└─────────────────────────┘
```

### Database Schema

```ruby
# Migration: add_parsed_fields_to_emails
class AddParsedFieldsToEmails < ActiveRecord::Migration[7.0]
  def change
    # Parsed components
    add_column :emails, :parsed_reply, :text
    add_column :emails, :parsed_signature, :text
    add_column :emails, :body_without_signature, :text
    
    # Metadata
    add_column :emails, :parsed_at, :datetime
    add_column :emails, :parser_version, :string
    add_column :emails, :parse_error, :text
    
    # Indexes for performance
    add_index :emails, :parsed_at
    add_index :emails, [:created_at], where: "parsed_at IS NULL", 
              name: 'index_emails_unparsed'
    
    # Cache key for deduplication
    add_column :emails, :body_hash, :string
    add_index :emails, :body_hash
  end
end
```

### Service Architecture

```ruby
# app/services/talon_email_parser.rb
class TalonEmailParser
  class << self
    def instance
      @instance ||= new
    end
    
    delegate :parse_reply, :extract_signature, :parse_email, to: :instance
  end
  
  def initialize
    @talon = PyCall.import_module('talon')
    @talon.init()
    @quotations = PyCall.import_module('talon.quotations')
    @signature = PyCall.import_module('talon.signature.bruteforce')
  rescue PyCall::PyError => e
    Rails.logger.error "Failed to initialize Talon: #{e.message}"
    raise
  end
  
  def parse_email(email_text)
    return {} if email_text.blank?
    
    # Generate hash for caching
    body_hash = Digest::SHA256.hexdigest(email_text)
    
    # Check cache first
    cached = Rails.cache.read("parsed_email:#{body_hash}")
    return cached if cached.present?
    
    # Parse email
    result = {
      original: email_text,
      reply: parse_reply(email_text),
      signature_data: extract_signature(email_text),
      body_hash: body_hash,
      parser_version: talon_version,
      parsed_at: Time.current
    }
    
    # Cache result
    Rails.cache.write("parsed_email:#{body_hash}", result, expires_in: 7.days)
    
    result
  rescue PyCall::PyError => e
    Rails.logger.error "Failed to parse email: #{e.message}"
    { error: e.message, body_hash: body_hash }
  end
  
  private
  
  def talon_version
    @talon_version ||= @talon.__version__ rescue 'unknown'
  end
end
```

## Implementation Phases

### Phase 1: PyCall Setup & Infrastructure (2 days)

**Tickets:**
- [ ] Add PyCall gem and configure Python environment
- [ ] Create Dockerfile with Python dependencies
- [ ] Set up PyCall initializer and health checks
- [ ] Document local development setup

**Acceptance Criteria:**
- PyCall successfully imports Talon library
- Health check endpoint verifies Python integration
- Docker build includes all Python dependencies
- Development setup documented in README

### Phase 2: Email Parser Service (3 days)

**Tickets:**
- [ ] Create TalonEmailParser service class
- [ ] Implement parse_reply and extract_signature methods
- [ ] Add caching layer for parsed results
- [ ] Create thread-safe connection pool

**Acceptance Criteria:**
- Service correctly extracts replies from test emails
- Signatures detected and extracted separately
- Cache hit ratio > 80% for duplicate emails
- Thread safety verified with concurrent tests

### Phase 3: Database Integration (2 days)

**Tickets:**
- [ ] Create migration for parsed email fields
- [ ] Update Email model with parsing methods
- [ ] Add scopes for parsed/unparsed emails
- [ ] Implement body_hash for deduplication

**Acceptance Criteria:**
- Migration runs successfully
- Model callbacks trigger parsing
- Unparsed scope returns correct records
- Duplicate emails share cached results

### Phase 4: Background Processing (2 days)

**Tickets:**
- [ ] Create EmailParsingJob for async processing
- [ ] Implement retry logic for failures
- [ ] Add batch processing rake task
- [ ] Configure job queue priorities

**Acceptance Criteria:**
- Jobs process within 5 seconds of creation
- Failed jobs retry with exponential backoff
- Batch task processes 1000+ emails/minute
- High priority emails processed first

### Phase 5: Monitoring & Optimization (2 days)

**Tickets:**
- [ ] Add parsing metrics and success rates
- [ ] Create admin dashboard for parsing stats
- [ ] Implement performance monitoring
- [ ] Add alerting for parsing failures

**Acceptance Criteria:**
- Dashboard shows real-time parsing metrics
- Success rate maintained above 95%
- P95 parsing time < 100ms
- Alerts trigger for failure spikes

### Phase 6: Testing & Documentation (1 day)

**Tickets:**
- [ ] Create comprehensive test suite
- [ ] Add example emails from various clients
- [ ] Document parsing limitations
- [ ] Create troubleshooting guide

**Acceptance Criteria:**
- Test coverage > 90%
- Examples cover all major email clients
- Documentation includes edge cases
- Troubleshooting covers common issues

## Success Metrics

1. **Parsing Accuracy**
   - 95%+ success rate for reply extraction
   - 90%+ success rate for signature detection
   - Support for 10+ email client formats

2. **Performance**
   - P50 parsing time < 50ms
   - P95 parsing time < 100ms
   - Cache hit ratio > 80%
   - Process 10,000 emails/hour

3. **Reliability**
   - Zero data loss from parsing failures
   - 99.9% uptime for parsing service
   - Graceful degradation on errors

4. **User Impact**
   - 50% reduction in email display size
   - Improved email thread readability
   - Faster email search performance

## Testing Strategy

### Unit Tests
```ruby
# spec/services/talon_email_parser_spec.rb
RSpec.describe TalonEmailParser do
  describe '#parse_reply' do
    it 'extracts reply from Gmail format' do
      email = File.read('spec/fixtures/emails/gmail_reply.txt')
      result = parser.parse_reply(email)
      expect(result).to eq("Thanks for your help!")
      expect(result).not_to include("On Mon, Oct 1")
    end
    
    it 'handles Outlook quoted format' do
      email = File.read('spec/fixtures/emails/outlook_reply.txt')
      result = parser.parse_reply(email)
      expect(result).not_to include("From:")
    end
  end
end
```

### Integration Tests
- Test with real email samples
- Verify database updates
- Test background job processing
- Validate caching behavior

### Performance Tests
- Benchmark parsing speed
- Memory usage profiling
- Concurrent request handling
- Large email processing

## Security Considerations

1. **Input Validation**
   - Sanitize email content before parsing
   - Limit maximum email size (1MB)
   - Validate UTF-8 encoding
   - Handle malformed emails gracefully

2. **Python Security**
   - Use specific Talon version
   - Audit Python dependencies
   - Isolate Python environment
   - Monitor for vulnerabilities

3. **Data Protection**
   - Don't log email content
   - Encrypt cached data
   - Implement retention policies
   - Handle PII appropriately

## Monitoring & Alerting

### Key Metrics
```ruby
# Track parsing performance
Metrics.increment('email_parser.parse_attempt')
Metrics.timing('email_parser.parse_time', duration)
Metrics.increment('email_parser.cache_hit') if cached

# Monitor failures
Metrics.increment('email_parser.parse_error', tags: ["error:#{error_type}"])
```

### Alerts
- Parsing success rate < 90%
- PyCall initialization failures
- Memory usage > threshold
- Queue depth > 1000 emails

### Dashboards
- Real-time parsing metrics
- Email client distribution
- Error analysis
- Performance trends

## Rollback Strategy

1. **Feature Flag Control**
   ```ruby
   if Feature.enabled?(:email_parsing)
     email.parse!
   end
   ```

2. **Gradual Rollout**
   - Start with 10% of emails
   - Monitor metrics
   - Increase gradually
   - Full rollout at 100%

3. **Emergency Disable**
   - Feature flag instant disable
   - Skip parsing in callbacks
   - Continue email creation
   - Fix issues offline

## Dependencies

- PyCall gem (~> 1.5)
- Python 3.8+
- Talon library (1.6.0)
- Redis for caching
- Sidekiq for job processing

## Risks & Mitigations

1. **Risk**: PyCall compatibility issues
   - **Mitigation**: Thorough testing, fallback to microservice if needed

2. **Risk**: Memory leaks from Python
   - **Mitigation**: Periodic worker restarts, memory monitoring

3. **Risk**: Parsing accuracy for new formats
   - **Mitigation**: Continuous testing, regular Talon updates

4. **Risk**: Performance degradation
   - **Mitigation**: Caching, async processing, horizontal scaling

## Future Enhancements

1. **HTML Email Support**
   - Parse HTML emails
   - Extract formatted replies
   - Preserve important formatting

2. **Machine Learning**
   - Train custom models
   - Improve accuracy for edge cases
   - Learn from corrections

3. **Advanced Features**
   - Thread reconstruction
   - Sentiment analysis
   - Auto-categorization
   - Language detection

4. **Integration Extensions**
   - Webhook for real-time parsing
   - API endpoint for external access
   - Bulk import tools
   - Export capabilities

## Implementation Checklist

- [ ] PyCall environment setup complete
- [ ] Talon library integrated successfully
- [ ] Database migrations applied
- [ ] Service classes implemented
- [ ] Background jobs configured
- [ ] Caching layer operational
- [ ] Test suite comprehensive
- [ ] Monitoring dashboards live
- [ ] Documentation complete
- [ ] Team training conducted
- [ ] Gradual rollout started
- [ ] Success metrics achieved