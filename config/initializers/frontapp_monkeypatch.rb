# Monkeypatch for frontapp gem to respect max_results parameter
# The original gem always fetches ALL pages, which causes it to hang on large datasets
# This patch adds max_results support to stop pagination early

require "frontapp"

module Frontapp
  class Client
    # Override the list method to respect max_results
    def list(path, params = {})
      # Extract max_results from params (don't send to API)
      max_results = params.delete(:max_results)
      max_results = params.delete("max_results") if max_results.nil?

      # If limit is specified without max_results, use it as max_results
      if max_results.nil? && params[:limit]
        max_results = params[:limit]
      end

      items = []
      last_page = false
      url = "#{base_url}/#{path}"

      # Track how many results we've collected
      total_collected = 0

      while !last_page
        # If we have a max_results limit, check if we've reached it
        if max_results && total_collected >= max_results
          break
        end

        # Adjust limit for final request if needed
        if max_results && params[:limit]
          remaining = max_results - total_collected
          if remaining < params[:limit]
            params = params.merge(limit: remaining)
          end
        end

        response = HTTParty.get(url, {
          body: params.to_json,
          headers: headers,
          format: :json
        })

        # Handle API errors
        raise Error.from_response(response) unless response.success?

        # Process results
        if block_given?
          yield response.parsed_response["_results"]
        else
          results = response.parsed_response["_results"] || []
          items.concat(results)
          total_collected += results.length
        end

        # Check for next page
        pagination = response.parsed_response["_pagination"]
        if pagination.nil? || pagination["next"].nil?
          last_page = true
        else
          url = pagination["next"]
          # Clear params for subsequent requests (pagination URL includes params)
          params = {}
        end

        # Safety check to prevent infinite loops
        break if total_collected > 10000
      end

      # Trim to max_results if we went over
      if max_results && items.length > max_results
        items = items.first(max_results)
      end

      items
    end

    # Add convenience methods that properly handle max_results

    # Override get_inbox_conversations to handle max_results
    alias_method :original_get_inbox_conversations, :get_inbox_conversations

    def get_inbox_conversations(inbox_id, params = {})
      # Preserve max_results through the permit call
      max_results = params[:max_results] || params["max_results"]

      cleaned = params.permit({ q: [ :statuses ] })
      cleaned[:max_results] = max_results if max_results

      list("inboxes/#{inbox_id}/conversations", cleaned)
    end

    # Override conversations method to handle max_results
    alias_method :original_conversations, :conversations

    def conversations(params = {})
      # Preserve max_results through the permit call
      max_results = params[:max_results] || params["max_results"]

      cleaned = params.permit({ q: [ :statuses ] })
      cleaned[:max_results] = max_results if max_results

      list("conversations", cleaned)
    end

    # Add helper method for other list-based endpoints
    def list_with_limit(path, params = {}, max_results = nil)
      params = params.dup
      params[:max_results] = max_results if max_results
      list(path, params)
    end
  end
end

# Log that the monkeypatch is loaded
Rails.logger.info "Frontapp monkeypatch loaded: Added max_results support to prevent fetching all pages"
