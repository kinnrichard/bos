<script lang="ts">
  export let title: string;
  export let type: 'checkbox' | 'search' = 'checkbox';
  export let options: Array<{ value: string; label: string }> = [];
  export let placeholder: string = '';
  export let selectedValues: string[] = [];
  export let onUpdate: (values: string[]) => void;

  let searchQuery = '';
  let searchResults: Array<{ value: string; label: string }> = [];

  function toggleOption(value: string) {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onUpdate(newValues);
  }

  function removeValue(value: string) {
    const newValues = selectedValues.filter(v => v !== value);
    onUpdate(newValues);
  }

  function handleSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    searchQuery = input.value;
    
    if (searchQuery.trim()) {
      // Simulate search results - in real app this would be an API call
      searchResults = [
        { value: searchQuery.toLowerCase().replace(/\s+/g, '_'), label: searchQuery }
      ].filter(result => !selectedValues.includes(result.value));
    } else {
      searchResults = [];
    }
  }

  function addSearchResult(result: { value: string; label: string }) {
    onUpdate([...selectedValues, result.value]);
    searchQuery = '';
    searchResults = [];
  }
</script>

<div class="filter-section">
  <h4 class="section-title">{title}</h4>
  
  {#if type === 'checkbox'}
    <div class="checkbox-options">
      {#each options as option}
        <label class="checkbox-option">
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            on:change={() => toggleOption(option.value)}
            class="checkbox-input"
          />
          <span class="checkbox-label">{option.label}</span>
        </label>
      {/each}
    </div>
  {:else if type === 'search'}
    <div class="search-section">
      <div class="search-input-wrapper">
        <input
          type="text"
          placeholder={placeholder}
          bind:value={searchQuery}
          on:input={handleSearchInput}
          class="search-input"
        />
        <img src="/icons/search.svg" alt="" class="search-icon" />
      </div>
      
      {#if searchResults.length > 0}
        <div class="search-results">
          {#each searchResults as result}
            <button
              class="search-result"
              on:click={() => addSearchResult(result)}
            >
              {result.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if selectedValues.length > 0}
    <div class="selected-values">
      {#each selectedValues as value}
        <span class="selected-tag">
          {options.find(opt => opt.value === value)?.label || value}
          <button
            class="remove-tag"
            on:click={() => removeValue(value)}
            aria-label="Remove {value}"
          >
            <img src="/icons/close.svg" alt="" />
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
  }

  .checkbox-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 0;
  }

  .checkbox-input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
  }

  .checkbox-label {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
  }

  .search-section {
    position: relative;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-input {
    width: 100%;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    padding: 8px 32px 8px 12px;
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s ease;
  }

  .search-input:focus {
    border-color: var(--accent-blue);
  }

  .search-input::placeholder {
    color: var(--text-tertiary);
  }

  .search-icon {
    position: absolute;
    right: 10px;
    width: 14px;
    height: 14px;
    opacity: 0.5;
    pointer-events: none;
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    max-height: 120px;
    overflow-y: auto;
    z-index: 10;
  }

  .search-result {
    width: 100%;
    background: none;
    border: none;
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .search-result:hover {
    background-color: var(--bg-secondary);
  }

  .selected-values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .selected-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--accent-blue);
    color: white;
    padding: 4px 6px 4px 8px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
  }

  .remove-tag {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.15s ease;
  }

  .remove-tag:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .remove-tag img {
    width: 10px;
    height: 10px;
    opacity: 0.8;
  }
</style>