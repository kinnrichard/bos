# frozen_string_literal: true

require_relative "configuration_service"
require_relative "schema_service"
require_relative "file_manager"
require_relative "template_renderer"
require_relative "type_mapper"
require_relative "relationship_processor"
require_relative "default_value_converter"

module Zero
  module Generators
    # ServiceRegistry manages service lifecycle, dependencies, and interactions
    #
    # This registry provides centralized service management for the Zero ActiveModels
    # generator system. It handles service initialization, dependency injection,
    # lifecycle management, health monitoring, and performance optimization.
    #
    # Key Responsibilities:
    # - Service initialization with proper dependency injection
    # - Service lifecycle management (start, stop, cleanup)
    # - Dependency resolution and circular dependency detection
    # - Health monitoring and service status reporting
    # - Performance optimization through service reuse
    # - Configuration propagation to all services
    # - Error handling and service recovery
    #
    # @example Basic usage
    #   registry = ServiceRegistry.new
    #   config_service = registry.get_service(:configuration)
    #   schema_service = registry.get_service(:schema)
    #
    # @example Custom initialization
    #   registry = ServiceRegistry.new(
    #     environment: "production",
    #     enable_caching: true
    #   )
    #
    class ServiceRegistry
      # Service management errors
      class ServiceError < StandardError; end
      class DependencyError < ServiceError; end
      class CircularDependencyError < DependencyError; end
      class ServiceNotFoundError < ServiceError; end

      # Service states for lifecycle management
      SERVICE_STATES = {
        uninitialized: :uninitialized,
        initializing: :initializing,
        initialized: :initialized,
        starting: :starting,
        running: :running,
        stopping: :stopping,
        stopped: :stopped,
        error: :error
      }.freeze

      # Service dependency graph
      SERVICE_DEPENDENCIES = {
        configuration: [],
        schema: [ :configuration ],
        file_manager: [ :configuration ],
        template_renderer: [ :configuration ],
        type_mapper: [ :configuration ],
        relationship_processor: [ :schema ],
        default_value_converter: [ :configuration ]
      }.freeze

      # Service initialization order (topologically sorted)
      SERVICE_INITIALIZATION_ORDER = [
        :configuration,
        :schema,
        :file_manager,
        :template_renderer,
        :type_mapper,
        :relationship_processor,
        :default_value_converter
      ].freeze

      attr_reader :services, :service_states, :configuration_options, :statistics

      # Initialize ServiceRegistry with configuration options
      #
      # @param environment [String, Symbol] Environment name
      # @param enable_caching [Boolean] Enable service caching
      # @param config_file_path [String] Path to configuration file
      # @param validate_services [Boolean] Validate services on initialization
      #
      def initialize(environment: nil, enable_caching: true, config_file_path: nil, validate_services: true)
        @configuration_options = {
          environment: environment,
          enable_caching: enable_caching,
          config_file_path: config_file_path,
          validate_services: validate_services
        }

        @services = {}
        @service_states = {}
        @dependency_graph = SERVICE_DEPENDENCIES.dup
        @statistics = {
          initializations: 0,
          dependency_resolutions: 0,
          health_checks: 0,
          errors: 0,
          service_reuses: 0
        }

        initialize_services if validate_services
      end

      # Get a service instance with lazy initialization
      #
      # @param service_name [Symbol] Service name to retrieve
      # @return [Object] Service instance
      # @raise [ServiceNotFoundError] If service is not registered
      #
      def get_service(service_name)
        service_name = service_name.to_sym

        unless service_exists?(service_name)
          raise ServiceNotFoundError, "Service '#{service_name}' is not registered"
        end

        # Return existing service if already initialized
        if service_initialized?(service_name)
          @statistics[:service_reuses] += 1
          return @services[service_name]
        end

        # Initialize service with dependencies
        initialize_service(service_name)
      end

      # Check if a service exists in the registry
      #
      # @param service_name [Symbol] Service name to check
      # @return [Boolean] True if service is registered
      #
      def service_exists?(service_name)
        SERVICE_DEPENDENCIES.key?(service_name.to_sym)
      end

      # Check if a service is initialized
      #
      # @param service_name [Symbol] Service name to check
      # @return [Boolean] True if service is initialized
      #
      def service_initialized?(service_name)
        service_name = service_name.to_sym
        @services.key?(service_name) &&
        @service_states[service_name] == SERVICE_STATES[:running]
      end

      # Get all available service names
      #
      # @return [Array<Symbol>] List of available service names
      #
      def available_services
        SERVICE_DEPENDENCIES.keys
      end

      # Get initialized service names
      #
      # @return [Array<Symbol>] List of initialized service names
      #
      def initialized_services
        @services.keys.select { |name| service_initialized?(name) }
      end

      # Initialize all services
      #
      # @param force [Boolean] Force re-initialization of existing services
      # @return [Hash] Initialization results
      #
      def initialize_all_services(force: false)
        results = {}
        errors = []

        SERVICE_INITIALIZATION_ORDER.each do |service_name|
          begin
            if force || !service_initialized?(service_name)
              results[service_name] = initialize_service(service_name)
            else
              results[service_name] = :already_initialized
            end
          rescue => e
            errors << { service: service_name, error: e.message }
            results[service_name] = :error
          end
        end

        {
          results: results,
          errors: errors,
          success: errors.empty?
        }
      end

      # Perform health check on all services
      #
      # @return [Hash] Health status for all services
      #
      def health_check
        @statistics[:health_checks] += 1

        health_status = {
          overall_status: :healthy,
          services: {},
          registry_stats: @statistics,
          dependency_graph: @dependency_graph
        }

        initialized_services.each do |service_name|
          begin
            service = @services[service_name]
            if service.respond_to?(:health_check)
              health_status[:services][service_name] = service.health_check
            else
              health_status[:services][service_name] = {
                status: :healthy,
                note: "Service does not implement health_check method"
              }
            end
          rescue => e
            health_status[:services][service_name] = {
              status: :unhealthy,
              error: e.message
            }
            health_status[:overall_status] = :degraded
          end
        end

        # Check for any unhealthy services
        unhealthy_services = health_status[:services].select do |_, status|
          status[:status] == :unhealthy
        end

        if unhealthy_services.any?
          health_status[:overall_status] = :unhealthy
        end

        health_status
      end

      # Get service statistics aggregated across all services
      #
      # @return [Hash] Aggregated service statistics
      #
      def aggregate_service_statistics
        aggregated = {
          registry: @statistics,
          services: {}
        }

        initialized_services.each do |service_name|
          service = @services[service_name]
          if service.respond_to?(:statistics)
            aggregated[:services][service_name] = service.statistics
          elsif service.respond_to?(:performance_stats)
            aggregated[:services][service_name] = service.performance_stats
          end
        end

        aggregated
      end

      # Shutdown all services gracefully
      #
      # @return [Hash] Shutdown results
      #
      def shutdown_all_services
        results = {}
        errors = []

        # Shutdown in reverse order to respect dependencies
        shutdown_order = SERVICE_INITIALIZATION_ORDER.reverse

        shutdown_order.each do |service_name|
          next unless service_initialized?(service_name)

          begin
            set_service_state(service_name, :stopping)
            service = @services[service_name]

            # Call shutdown method if service implements it
            if service.respond_to?(:shutdown)
              service.shutdown
            end

            set_service_state(service_name, :stopped)
            results[service_name] = :shutdown_success
          rescue => e
            set_service_state(service_name, :error)
            errors << { service: service_name, error: e.message }
            results[service_name] = :shutdown_error
          end
        end

        # Clear services and states
        @services.clear
        @service_states.clear

        {
          results: results,
          errors: errors,
          success: errors.empty?
        }
      end

      # Clear service cache and force re-initialization
      #
      # @param service_name [Symbol] Specific service to clear, or nil for all
      #
      def clear_service_cache(service_name = nil)
        if service_name
          service_name = service_name.to_sym
          @services.delete(service_name)
          @service_states.delete(service_name)
        else
          @services.clear
          @service_states.clear
        end
      end

      # Update configuration for all services
      #
      # @param new_configuration [Hash] New configuration options
      #
      def update_configuration(new_configuration)
        @configuration_options.merge!(new_configuration)

        # Propagate configuration changes to configuration service
        if service_initialized?(:configuration)
          config_service = @services[:configuration]
          new_configuration.each do |key, value|
            config_service.update_config(key, value) if config_service.respond_to?(:update_config)
          end
        end

        # Clear dependent services to force re-initialization with new config
        dependent_services = find_services_dependent_on(:configuration)
        dependent_services.each { |service| clear_service_cache(service) }
      end

      private

      # Initialize all services in dependency order
      #
      def initialize_services
        SERVICE_INITIALIZATION_ORDER.each do |service_name|
          initialize_service(service_name)
        end
      end

      # Initialize a specific service with dependency resolution
      #
      # @param service_name [Symbol] Service to initialize
      # @return [Object] Initialized service instance
      #
      def initialize_service(service_name)
        service_name = service_name.to_sym

        # Check for circular dependencies
        check_circular_dependencies(service_name)

        # Set state to initializing
        set_service_state(service_name, :initializing)

        begin
          # Resolve dependencies first
          dependencies = resolve_dependencies(service_name)

          # Create service instance
          service = create_service_instance(service_name, dependencies)

          # Store service and update state
          @services[service_name] = service
          set_service_state(service_name, :running)

          @statistics[:initializations] += 1
          service
        rescue => e
          set_service_state(service_name, :error)
          @statistics[:errors] += 1
          raise ServiceError, "Failed to initialize service '#{service_name}': #{e.message}"
        end
      end

      # Resolve dependencies for a service
      #
      # @param service_name [Symbol] Service name
      # @return [Hash] Resolved dependencies
      #
      def resolve_dependencies(service_name)
        dependencies = {}
        dependency_names = @dependency_graph[service_name] || []

        dependency_names.each do |dep_name|
          dependencies[dep_name] = get_service(dep_name)
        end

        @statistics[:dependency_resolutions] += 1
        dependencies
      end

      # Create service instance with proper configuration
      #
      # @param service_name [Symbol] Service to create
      # @param dependencies [Hash] Resolved dependencies
      # @return [Object] Created service instance
      #
      def create_service_instance(service_name, dependencies)
        case service_name
        when :configuration
          create_configuration_service
        when :schema
          create_schema_service(dependencies)
        when :file_manager
          create_file_manager(dependencies)
        when :template_renderer
          create_template_renderer(dependencies)
        when :type_mapper
          create_type_mapper(dependencies)
        when :relationship_processor
          # Note: RelationshipProcessor is typically created per-use, not as singleton
          # This creates a factory method
          create_relationship_processor_factory(dependencies)
        when :default_value_converter
          create_default_value_converter(dependencies)
        else
          raise ServiceError, "Unknown service type: #{service_name}"
        end
      end

      # Service creation methods

      def create_configuration_service
        ConfigurationService.new(
          environment: @configuration_options[:environment],
          config_file_path: @configuration_options[:config_file_path],
          validate_on_load: @configuration_options[:validate_services]
        )
      end

      def create_schema_service(dependencies)
        config = dependencies[:configuration]
        SchemaService.new(
          cache_enabled: config.enable_schema_caching?,
          enable_pattern_detection: config.enable_pattern_detection?
        )
      end

      def create_file_manager(dependencies)
        config = dependencies[:configuration]
        output_dir = config.base_output_dir

        # Create shell instance for FileManager
        shell = create_shell_instance

        # Create options hash for FileManager
        options = {
          dry_run: false,
          skip_prettier: !config.enable_prettier?,
          force: config.force_overwrite?
        }

        FileManager.new(options, shell, output_dir)
      end

      def create_template_renderer(dependencies)
        config = dependencies[:configuration]

        # Determine templates directory
        templates_dir = File.expand_path("templates", File.dirname(__FILE__))

        TemplateRenderer.new(
          templates_dir,
          cache_enabled: config.enable_template_caching?
        )
      end

      def create_type_mapper(dependencies)
        config = dependencies[:configuration]

        TypeMapper.new(
          custom_mappings: config.type_overrides,
          unknown_type_handler: "unknown"
        )
      end

      def create_relationship_processor_factory(dependencies)
        # Return a factory that creates RelationshipProcessor instances
        lambda do |relationships, current_table_name|
          RelationshipProcessor.new(relationships, current_table_name)
        end
      end

      def create_default_value_converter(dependencies)
        DefaultValueConverter.new
      end

      # Create a shell instance for services that need it
      #
      # @return [Object] Shell instance (simplified for services)
      #
      def create_shell_instance
        # Create a simple shell-like object for service use
        Class.new do
          def say_status(status, message, color = nil)
            # Simple implementation - could be enhanced for actual shell integration
            puts "[#{status.to_s.upcase}] #{message}"
          end

          def say(message, color = nil)
            puts message
          end
        end.new
      end

      # Check for circular dependencies
      #
      # @param service_name [Symbol] Service to check
      # @param visited [Set] Already visited services
      # @param path [Array] Current dependency path
      #
      def check_circular_dependencies(service_name, visited = Set.new, path = [])
        if path.include?(service_name)
          cycle = path[path.index(service_name)..-1] + [ service_name ]
          raise CircularDependencyError, "Circular dependency detected: #{cycle.join(' -> ')}"
        end

        return if visited.include?(service_name)
        visited.add(service_name)

        dependencies = @dependency_graph[service_name] || []
        dependencies.each do |dep_name|
          check_circular_dependencies(dep_name, visited, path + [ service_name ])
        end
      end

      # Find services that depend on a given service
      #
      # @param service_name [Symbol] Service to find dependents for
      # @return [Array<Symbol>] List of dependent service names
      #
      def find_services_dependent_on(service_name)
        dependents = []
        @dependency_graph.each do |service, dependencies|
          dependents << service if dependencies.include?(service_name)
        end
        dependents
      end

      # Set service state
      #
      # @param service_name [Symbol] Service name
      # @param state [Symbol] New state
      #
      def set_service_state(service_name, state)
        @service_states[service_name] = SERVICE_STATES[state]
      end
    end
  end
end
