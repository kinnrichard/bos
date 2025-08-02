# EP-0024: Unified Person Component Architecture

## Overview
Create a unified, beautiful, and maintainable architecture for all person-related views (create, view, edit) using a hybrid component approach. This replaces EP-0023 by expanding the scope to include not just form consolidation but a complete architectural redesign that maximizes code reuse while maintaining optimal performance and user experience for each mode.

## Problem Statement
Currently, we have three completely different implementations for person-related interfaces:
1. **New Person Form** (`/people/new`): Beautiful, modern UI with contact normalization and dynamic features
2. **Edit Person View** (`/people/[personId]` inline): Clunky inline editing that doesn't match the new form
3. **View Person Display** (`/people/[personId]` view mode): Basic display that doesn't share the beautiful design

This fragmentation creates multiple issues:
- **Inconsistent UX**: Three different interfaces for related tasks confuse users
- **Triple Maintenance**: Same logic and styling maintained in three places
- **Wasted Effort**: Beautiful features only exist in one mode
- **Poor Performance**: View mode loads edit logic it doesn't need
- **Design Drift**: Interfaces diverge over time without shared components

## Business Value
- **Superior User Experience**: Consistent, beautiful interface across all person interactions
- **Reduced Development Time**: 80% code reuse across all modes
- **Easier Maintenance**: Shared components mean single-point updates
- **Better Performance**: Optimized bundles for each mode
- **Design Consistency**: Shared components prevent UI drift
- **Faster Feature Development**: New features automatically work across all modes

## Solution: Hybrid Component Architecture

### Core Architectural Principle
**"Share the presentation layer, separate the interaction layer"**

This hybrid approach gives us the best of both worlds:
- Visual consistency and code reuse through shared layout components
- Optimized performance through mode-specific interaction components
- Clear separation of concerns for maintainability

### 1. Component Architecture

#### Shared Components (Presentation Layer)
```
/src/lib/components/people/shared/
├── PersonLayout.svelte          # Overall container and spacing
├── PersonHeader.svelte          # Icon, name, title display
├── PersonContactList.svelte     # Contact list container
├── ContactItem.svelte           # Single contact display/edit
├── ContactTypeIndicator.svelte  # Icon and label for contact type
├── PersonGroups.svelte          # Groups/departments display
├── PersonMetadata.svelte        # Status badges, timestamps
└── styles/
    ├── person-layout.css        # Shared layout styles
    └── person-theme.css         # Design tokens and variables
```

#### Mode-Specific Components (Interaction Layer)
```
/src/lib/components/people/
├── PersonForm.svelte            # Orchestrates create/edit modes
├── PersonView.svelte            # Orchestrates view mode
├── create/
│   └── PersonCreateFields.svelte
├── edit/
│   └── PersonEditFields.svelte
└── view/
    └── PersonViewFields.svelte
```

### 2. Component Interfaces

#### PersonLayout (Shared Container)
```svelte
<script lang="ts">
  interface Props {
    mode: 'create' | 'edit' | 'view';
    person?: Person;
    client?: Client;
    loading?: boolean;
    error?: string | null;
  }
  
  const { mode, person, client, loading, error }: Props = $props();
</script>

<div class="person-layout" data-mode={mode}>
  {#if error}
    <div class="error-message">{error}</div>
  {/if}
  
  <slot name="header" />
  <slot name="fields" />
  <slot name="contacts" />
  <slot name="groups" />
  <slot name="actions" />
</div>

<style>
  .person-layout {
    /* Shared layout styles for all modes */
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .person-layout[data-mode="view"] {
    /* View-specific adjustments */
  }
</style>
```

#### PersonHeader (Shared Header)
```svelte
<script lang="ts">
  interface Props {
    mode: 'create' | 'edit' | 'view';
    name: string;
    namePreferred?: string;
    namePronunciation?: string;
    title?: string;
    isActive?: boolean;
    onEdit?: () => void;  // For view mode edit button
  }
</script>

<div class="person-header">
  <div class="person-icon">
    <img src="/icons/person.circle.fill.svg" alt="" />
  </div>
  
  <div class="person-info">
    {#if mode === 'view'}
      <h1>{namePreferred || name}</h1>
      {#if namePronunciation}
        <span class="pronunciation">({namePronunciation})</span>
      {/if}
    {:else}
      <slot name="name-input" />
    {/if}
    
    {#if title}
      {#if mode === 'view'}
        <p class="title">{title}</p>
      {:else}
        <slot name="title-input" />
      {/if}
    {/if}
  </div>
  
  {#if mode === 'view' && onEdit}
    <button class="edit-button" onclick={onEdit}>
      <img src="/icons/pencil.svg" alt="Edit" />
    </button>
  {/if}
</div>
```

#### PersonForm (Create/Edit Orchestrator)
```svelte
<script lang="ts">
  import PersonLayout from './shared/PersonLayout.svelte';
  import PersonHeader from './shared/PersonHeader.svelte';
  import PersonContactList from './shared/PersonContactList.svelte';
  import PersonGroups from './shared/PersonGroups.svelte';
  import { normalizeContact, resizeInput } from '$lib/utils/contactNormalizer';
  
  interface Props {
    mode: 'create' | 'edit';
    person?: Person;
    clientId: string;
    onSuccess?: (person: Person) => void;
    onCancel?: () => void;
  }
  
  const { mode, person, clientId, onSuccess, onCancel }: Props = $props();
  
  // Form state
  let formData = $state({
    name: person?.name || '',
    namePreferred: person?.name_preferred || '',
    namePronunciation: person?.name_pronunciation_hint || '',
    title: person?.title || '',
    isActive: person?.is_active ?? true,
  });
  
  // Contact methods with all the beautiful features
  let contactMethods = $state<TempContactMethod[]>(/* ... */);
  
  // All the dynamic width calculation logic
  function handleContactInput(method, index, event) { /* ... */ }
  function handleContactBlur(method, index, event) { /* ... */ }
  
  // Save handling
  async function handleSubmit() { /* ... */ }
</script>

<PersonLayout {mode} {person}>
  <PersonHeader slot="header" {mode} {...formData}>
    <ChromelessInput 
      slot="name-input"
      bind:value={formData.name}
      class="name-input"
      oninput={() => resizeInput()}
    />
    <ChromelessInput 
      slot="title-input"
      bind:value={formData.title}
      class="title-input"
      oninput={() => resizeInput()}
    />
  </PersonHeader>
  
  <PersonContactList slot="contacts" {mode}>
    {#each contactMethods as method, index}
      <ContactItem
        {mode}
        {method}
        {index}
        onInput={handleContactInput}
        onBlur={handleContactBlur}
      />
    {/each}
  </PersonContactList>
  
  <PersonGroups 
    slot="groups"
    {mode}
    groups={formData.selectedGroupIds}
    departments={formData.selectedDepartmentIds}
  />
</PersonLayout>
```

#### PersonView (View Mode Orchestrator)
```svelte
<script lang="ts">
  import PersonLayout from './shared/PersonLayout.svelte';
  import PersonHeader from './shared/PersonHeader.svelte';
  import PersonContactList from './shared/PersonContactList.svelte';
  import PersonGroups from './shared/PersonGroups.svelte';
  import { goto } from '$app/navigation';
  
  interface Props {
    person: Person;
    clientId: string;
    canEdit?: boolean;
    canDelete?: boolean;
  }
  
  const { person, clientId, canEdit, canDelete }: Props = $props();
  
  function handleEdit() {
    goto(`/clients/${clientId}/people/${person.id}/edit`);
  }
</script>

<PersonLayout mode="view" {person}>
  <PersonHeader 
    slot="header"
    mode="view"
    name={person.name}
    namePreferred={person.name_preferred}
    namePronunciation={person.name_pronunciation_hint}
    title={person.title}
    isActive={person.is_active}
    onEdit={canEdit ? handleEdit : undefined}
  />
  
  <PersonContactList slot="contacts" mode="view">
    {#each person.contactMethods as method}
      <ContactItem
        mode="view"
        type={method.contact_type}
        value={method.formatted_value || method.value}
      />
    {/each}
  </PersonContactList>
  
  <PersonGroups 
    slot="groups"
    mode="view"
    groups={person.groups}
    departments={person.departments}
  />
</PersonLayout>
```

### 3. Route Structure

#### Clean URL Architecture
```
/clients/[id]/people              # List all people
/clients/[id]/people/new          # Create new person
/clients/[id]/people/[personId]   # View person (read-only)
/clients/[id]/people/[personId]/edit  # Edit person
```

#### Route Implementations

**New Person Route** (`/people/new/+page.svelte`)
```svelte
<script>
  import PersonForm from '$lib/components/people/PersonForm.svelte';
</script>

<PersonForm mode="create" {clientId} {onSuccess} {onCancel} />
```

**View Person Route** (`/people/[personId]/+page.svelte`)
```svelte
<script>
  import PersonView from '$lib/components/people/PersonView.svelte';
</script>

<PersonView {person} {clientId} {canEdit} {canDelete} />
```

**Edit Person Route** (`/people/[personId]/edit/+page.svelte`)
```svelte
<script>
  import PersonForm from '$lib/components/people/PersonForm.svelte';
</script>

<PersonForm mode="edit" {person} {clientId} {onSuccess} {onCancel} />
```

### 4. Shared Features Across All Modes

#### Visual Consistency
- Same layout structure and spacing
- Consistent typography and colors
- Shared icon system
- Unified contact type indicators

#### Smart Features (Edit/Create Only)
- Contact normalization (email/phone/address)
- Dynamic width calculation
- Auto-expanding contact fields
- Auto-removal of empty fields
- Type detection with visual indicators

#### Display Features (All Modes)
- Beautiful person icon header
- Contact type icons
- Group/department badges
- Status indicators
- Responsive design

### 5. Performance Optimizations

#### Code Splitting Strategy
```javascript
// View mode - lightweight bundle
import PersonView from '$lib/components/people/PersonView.svelte';
// No normalization utilities, no validation, no dynamic width logic

// Edit mode - full featured bundle  
import PersonForm from '$lib/components/people/PersonForm.svelte';
import { normalizeContact, resizeInput } from '$lib/utils/contactNormalizer';
```

#### Lazy Loading
```svelte
<!-- Only load edit components when needed -->
{#if isEditing}
  {#await import('./PersonForm.svelte') then { default: PersonForm }}
    <PersonForm {...props} />
  {/await}
{:else}
  <PersonView {...props} />
{/if}
```

### 6. Testing Strategy

#### Unit Tests
```typescript
// Shared components
describe('PersonHeader', () => {
  test('renders correctly in view mode');
  test('renders correctly in edit mode');
  test('shows edit button when canEdit is true');
});

describe('PersonContactList', () => {
  test('displays contacts in view mode');
  test('handles dynamic fields in edit mode');
  test('maintains minimum 2 fields');
});

// Mode-specific components
describe('PersonForm', () => {
  test('creates new person');
  test('updates existing person');
  test('normalizes contacts on blur');
  test('dynamically resizes inputs');
});

describe('PersonView', () => {
  test('displays person information');
  test('navigates to edit on button click');
  test('shows formatted contact values');
});
```

#### Integration Tests
- Complete create person flow
- View to edit navigation
- Edit and save flow
- Cancel operations
- Contact method CRUD

## Implementation Steps

### Phase 1: Shared Components (4 hours)
1. Create `PersonLayout` component
2. Create `PersonHeader` component
3. Create `PersonContactList` component
4. Create `ContactItem` component
5. Create `ContactTypeIndicator` component
6. Extract shared styles

### Phase 2: Form Consolidation (4 hours)
1. Create `PersonForm` orchestrator
2. Migrate new person page to use `PersonForm`
3. Create edit route and page
4. Update toolbar recognition

### Phase 3: View Mode Enhancement (3 hours)
1. Create `PersonView` orchestrator
2. Update view page to use new components
3. Add edit button and navigation
4. Remove old inline edit code

### Phase 4: Testing & Polish (3 hours)
1. Unit tests for all components
2. Integration tests for workflows
3. Performance testing
4. Visual regression testing
5. Accessibility audit

## Success Criteria
- [ ] All three modes use shared presentation components
- [ ] 80% code reuse across modes
- [ ] View mode bundle is <50% size of edit mode bundle
- [ ] All contact normalization features work
- [ ] Dynamic width calculation works
- [ ] Visual consistency across all modes
- [ ] Edit button navigates to dedicated edit route
- [ ] No regression in functionality
- [ ] All tests passing
- [ ] Performance metrics meet targets

## Metrics for Success

### Code Metrics
- Lines of code reduced by >60%
- Component count reduced by >40%
- CSS duplication reduced by >70%

### Performance Metrics
- View mode initial load <100ms
- Edit mode initial load <200ms
- No layout shift when switching modes

### User Experience Metrics
- Task completion time reduced by 20%
- Error rate reduced by 30%
- User satisfaction score increased

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-abstraction complexity | High | Keep interaction layer separate, document patterns clearly |
| Performance regression | Medium | Implement code splitting, lazy loading, measure bundles |
| Migration bugs | Medium | Comprehensive testing, feature flags for rollout |
| Component coupling | Low | Clear interfaces, single responsibility principle |

## Estimated Effort
- **Total**: 14-16 hours
- **Development**: 11 hours
- **Testing**: 3 hours
- **Documentation & Review**: 2 hours

## Dependencies
- Existing contactNormalizer utility
- ChromelessInput component
- Person and ContactMethod models
- Reactive models for data loading
- Current routing system

## Migration Path

### Week 1
1. Build shared components in parallel with existing code
2. Test shared components in isolation
3. Create PersonForm orchestrator

### Week 2
1. Migrate new person page to PersonForm
2. Create edit route using PersonForm
3. Update navigation and toolbar

### Week 3
1. Create PersonView orchestrator
2. Migrate view page to new architecture
3. Remove old inline edit code
4. Full testing and polish

## Future Enhancements (Out of Scope)
- Inline editing capabilities (if needed later)
- Advanced field customization per client
- Bulk editing interface
- Person comparison view
- Version history display
- Real-time collaboration

## Definition of Done
- [ ] Shared components created and documented
- [ ] PersonForm handles create and edit modes
- [ ] PersonView provides beautiful read-only display
- [ ] All routes working with new components
- [ ] 80% code reuse achieved
- [ ] Bundle sizes optimized
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] Deployed to staging
- [ ] User acceptance testing complete
- [ ] Deployed to production

## Architecture Decision Records

### ADR-001: Hybrid Approach Over Full DRY
**Decision**: Use shared presentation components with separate interaction layers
**Rationale**: Balances code reuse (80%) with performance and maintainability
**Consequences**: Slightly more components but clearer separation of concerns

### ADR-002: Separate Edit Route Over Inline Editing  
**Decision**: Dedicated `/edit` route instead of inline editing
**Rationale**: Cleaner navigation, better performance, clearer user mental model
**Consequences**: Additional route but simpler state management

### ADR-003: Slots Over Props for Composition
**Decision**: Use Svelte slots for component composition
**Rationale**: More flexible, better TypeScript support, cleaner APIs
**Consequences**: More verbose templates but better maintainability