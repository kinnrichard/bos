# Configure dartsass-rails to include component directories
Rails.application.config.dartsass.builds = {
  "application.scss" => "application.css"
}

# Add component directories to the load path
Rails.application.config.dartsass.load_paths = [
  Rails.root.join("app/assets/stylesheets"),
  Rails.root.join("app/components")
]