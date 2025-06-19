// Simple search functionality without Stimulus
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.querySelector('.search-input');
  const searchDropdown = document.querySelector('.search-dropdown');
  const searchResults = searchDropdown?.querySelector('[data-search-target="results"]');
  
  if (!searchInput || !searchDropdown || !searchResults) return;
  
  let searchTimeout;
  
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value;
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      searchDropdown.classList.add('hidden');
      return;
    }
    
    searchTimeout = setTimeout(() => {
      fetch(`/clients/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'text/html'
        }
      })
      .then(response => response.text())
      .then(html => {
        searchResults.innerHTML = html;
        searchDropdown.classList.remove('hidden');
      })
      .catch(error => {
        console.error('Search error:', error);
      });
    }, 300);
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
      searchDropdown.classList.add('hidden');
    }
  });
  
  // Handle result clicks
  searchResults.addEventListener('click', function(e) {
    const resultLink = e.target.closest('.search-result');
    if (resultLink && resultLink.classList.contains('new-client')) {
      e.preventDefault();
      const name = searchInput.value;
      window.location.href = `/clients/new?name=${encodeURIComponent(name)}`;
    }
  });
});