// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import { Turbo } from "@hotwired/turbo-rails"

// Disable Turbo Drive but keep Turbo Streams for server-driven sorting
Turbo.session.drive = false

import "controllers"
