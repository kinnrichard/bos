# frozen_string_literal: true

require "erb"
require "benchmark"

module Zero
  module Generators
    # TemplateRenderer provides a dedicated service for ERB template rendering
    # with enhanced error handling, validation, and performance features.
    #
    # Features:
    # - Template existence validation with helpful error messages
    # - Centralized context building and variable management
    # - Performance metrics and optional template caching
    # - Development-mode template reloading
    # - Comprehensive error handling with debugging support
    #
    # Usage:
    #   renderer = TemplateRenderer.new("path/to/templates")
    #   content = renderer.render("template.erb", { variable: "value" })
    #
    class TemplateRenderer
      class TemplateNotFoundError < StandardError; end
      class TemplateRenderingError < StandardError; end

      attr_reader :templates_dir, :cache_enabled, :performance_metrics

      # Initialize TemplateRenderer with template directory and options
      #
      # @param templates_dir [String] Path to the templates directory
      # @param cache_enabled [Boolean] Enable template caching for performance (default: false)
      def initialize(templates_dir, cache_enabled: false)
        @templates_dir = File.expand_path(templates_dir)
        @cache_enabled = cache_enabled
        @template_cache = {}
        @performance_metrics = {
          renders: 0,
          total_time: 0.0,
          cache_hits: 0,
          cache_misses: 0
        }

        validate_templates_directory!
      end

      # Render an ERB template with the provided context
      #
      # @param template_name [String] Name of the template file (e.g., 'data_interface.ts.erb')
      # @param context [Hash] Variables to make available in the template
      # @return [String] Rendered template content
      # @raise [TemplateNotFoundError] If template file doesn't exist
      # @raise [TemplateRenderingError] If template rendering fails
      def render(template_name, context = {})
        validate_template_exists!(template_name)

        rendered_content = nil
        render_time = Benchmark.realtime do
          template_content = load_template_content(template_name)
          rendered_content = render_erb_template(template_content, context)
        end

        update_performance_metrics(render_time)
        rendered_content
      rescue => e
        handle_rendering_error(template_name, e)
      end

      # Get list of available template files
      #
      # @return [Array<String>] Array of template file names
      def available_templates
        return [] unless Dir.exist?(@templates_dir)

        Dir.entries(@templates_dir)
           .select { |file| file.end_with?(".erb") }
           .sort
      end

      # Validate that a template exists and provide helpful error message if not
      #
      # @param template_name [String] Name of the template file
      # @return [Boolean] True if template exists
      # @raise [TemplateNotFoundError] If template doesn't exist
      def validate_template_exists!(template_name)
        template_path = File.join(@templates_dir, template_name)

        unless File.exist?(template_path)
          available = available_templates
          error_message = build_template_not_found_message(template_name, available)
          raise TemplateNotFoundError, error_message
        end

        true
      end

      # Check if template exists without raising an error
      #
      # @param template_name [String] Name of the template file
      # @return [Boolean] True if template exists
      def template_exists?(template_name)
        template_path = File.join(@templates_dir, template_name)
        File.exist?(template_path)
      end

      # Clear template cache (useful in development mode)
      #
      # @return [Integer] Number of cached templates cleared
      def clear_cache!
        cleared_count = @template_cache.size
        @template_cache.clear
        @performance_metrics[:cache_hits] = 0
        @performance_metrics[:cache_misses] = 0
        cleared_count
      end

      # Get performance statistics
      #
      # @return [Hash] Performance metrics including render count, total time, cache stats
      def statistics
        {
          renders: @performance_metrics[:renders],
          total_time: @performance_metrics[:total_time].round(4),
          average_time: calculate_average_render_time,
          cache_enabled: @cache_enabled,
          cache_hits: @performance_metrics[:cache_hits],
          cache_misses: @performance_metrics[:cache_misses],
          cache_hit_ratio: calculate_cache_hit_ratio,
          cached_templates: @template_cache.size
        }
      end

      private

      # Validate that the templates directory exists and is readable
      #
      # @raise [ArgumentError] If templates directory is invalid
      def validate_templates_directory!
        unless Dir.exist?(@templates_dir)
          raise ArgumentError, "Templates directory does not exist: #{@templates_dir}"
        end

        unless File.readable?(@templates_dir)
          raise ArgumentError, "Templates directory is not readable: #{@templates_dir}"
        end
      end

      # Load template content from file or cache
      #
      # @param template_name [String] Name of the template file
      # @return [String] Template file content
      def load_template_content(template_name)
        if @cache_enabled
          load_cached_template_content(template_name)
        else
          load_fresh_template_content(template_name)
        end
      end

      # Load template content from cache or file system
      #
      # @param template_name [String] Name of the template file
      # @return [String] Template file content
      def load_cached_template_content(template_name)
        template_path = File.join(@templates_dir, template_name)
        cache_key = template_path

        # Check if cached version is still valid (development mode reloading)
        if @template_cache[cache_key] && !template_modified_since_cache?(template_path, cache_key)
          @performance_metrics[:cache_hits] += 1
          return @template_cache[cache_key]
        end

        # Load fresh content and cache it
        content = load_fresh_template_content(template_name)
        @template_cache[cache_key] = content
        @performance_metrics[:cache_misses] += 1
        content
      end

      # Load template content directly from file system
      #
      # @param template_name [String] Name of the template file
      # @return [String] Template file content
      def load_fresh_template_content(template_name)
        template_path = File.join(@templates_dir, template_name)
        File.read(template_path)
      end

      # Check if template file has been modified since it was cached
      #
      # @param template_path [String] Full path to template file
      # @param cache_key [String] Cache key for the template
      # @return [Boolean] True if template has been modified
      def template_modified_since_cache?(template_path, cache_key)
        return false unless @template_cache.key?(cache_key)

        current_mtime = File.mtime(template_path)
        cached_mtime = @template_cache["#{cache_key}_mtime"]

        cached_mtime.nil? || current_mtime > cached_mtime
      end

      # Render ERB template with context binding
      #
      # @param template_content [String] ERB template content
      # @param context [Hash] Variables to make available in template
      # @return [String] Rendered template content
      def render_erb_template(template_content, context)
        # Create binding with context variables
        template_binding = create_template_binding(context)

        # Render ERB template with trim mode for cleaner output
        erb = ERB.new(template_content, trim_mode: "-")
        erb.result(template_binding)
      end

      # Create a binding object with template context variables
      #
      # This creates an isolated binding context to avoid polluting the
      # TemplateRenderer instance with template-specific variables.
      #
      # @param context [Hash] Variables to make available in template
      # @return [Binding] Binding object for ERB rendering
      def create_template_binding(context)
        # Create a new object to avoid polluting self
        template_object = Object.new

        # Define each context variable as a method on the template object
        # This allows templates to access variables naturally: <%= variable_name %>
        context.each do |key, value|
          template_object.define_singleton_method(key) { value }
        end

        # Return the binding for this isolated object
        template_object.instance_eval { binding }
      end

      # Build helpful error message for missing templates
      #
      # @param template_name [String] Name of the requested template
      # @param available_templates [Array<String>] List of available templates
      # @return [String] Formatted error message with suggestions
      def build_template_not_found_message(template_name, available_templates)
        message = "Template not found: #{template_name} in #{@templates_dir}"

        if available_templates.any?
          message += "\n\nAvailable templates:"
          available_templates.each do |template|
            message += "\n  - #{template}"
          end

          # Suggest similar template names
          similar = find_similar_template_names(template_name, available_templates)
          if similar.any?
            message += "\n\nDid you mean:"
            similar.each do |suggestion|
              message += "\n  - #{suggestion}"
            end
          end
        else
          message += "\n\nNo templates found in templates directory."
        end

        message
      end

      # Find template names similar to the requested one
      #
      # @param template_name [String] Requested template name
      # @param available_templates [Array<String>] Available templates
      # @return [Array<String>] Similar template names
      def find_similar_template_names(template_name, available_templates)
        # Simple similarity check based on string inclusion
        similar = available_templates.select do |template|
          template_name.downcase.include?(template.split(".").first.downcase) ||
          template.split(".").first.downcase.include?(template_name.downcase)
        end

        similar.first(3) # Limit to top 3 suggestions
      end

      # Handle template rendering errors with comprehensive debugging info
      #
      # @param template_name [String] Name of the template that failed
      # @param error [Exception] The original error
      # @raise [TemplateRenderingError] Enhanced error with debugging context
      def handle_rendering_error(template_name, error)
        error_message = "Failed to render template '#{template_name}': #{error.message}"

        # Add debugging context in development
        if defined?(Rails) && Rails.env.development?
          error_message += "\n\nTemplate path: #{File.join(@templates_dir, template_name)}"
          error_message += "\nError class: #{error.class}"
          error_message += "\nBacktrace: #{error.backtrace.first(3).join("\n")}"
        end

        raise TemplateRenderingError, error_message
      end

      # Update performance tracking metrics
      #
      # @param render_time [Float] Time taken for this render operation
      def update_performance_metrics(render_time)
        @performance_metrics[:renders] += 1
        @performance_metrics[:total_time] += render_time
      end

      # Calculate average render time per template
      #
      # @return [Float] Average render time in seconds
      def calculate_average_render_time
        return 0.0 if @performance_metrics[:renders] == 0

        (@performance_metrics[:total_time] / @performance_metrics[:renders]).round(4)
      end

      # Calculate cache hit ratio as percentage
      #
      # @return [Float] Cache hit ratio as percentage (0-100)
      def calculate_cache_hit_ratio
        total_attempts = @performance_metrics[:cache_hits] + @performance_metrics[:cache_misses]
        return 0.0 if total_attempts == 0

        ((@performance_metrics[:cache_hits].to_f / total_attempts) * 100).round(2)
      end
    end
  end
end
