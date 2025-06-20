# Pin npm packages by running ./bin/importmap

pin "application"
# Turbo disabled per requirements
# pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Sortable.js
pin "sortable.min", to: "sortable.min.js"
pin "sortablejs", to: "sortable-wrapper.js"
