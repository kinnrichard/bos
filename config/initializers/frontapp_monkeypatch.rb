# Monkeypatch for frontapp gem to respect max_results parameter and add pagination
# The original gem always fetches ALL pages, which causes it to hang on large datasets
# This patch adds:
#   1. max_results support to stop pagination early
#   2. fetch_all flag to get original behavior when needed
#   3. Single page methods for manual pagination
#
# Usage examples:
#   # Get just first 10 results (fast!)
#   client.get_inbox_conversations(inbox_id, max_results: 10)
#
#   # Manual pagination - get one page at a time
#   page1 = client.get_inbox_conversations_page(inbox_id, limit: 25)
#   # page1 = { results: [...], next_token: "...", has_more: true }
#
#   page2 = client.get_inbox_conversations_page(inbox_id, limit: 25, page_token: page1[:next_token])
#
#   # Get ALL results (original behavior - careful with large datasets!)
#   client.get_inbox_conversations(inbox_id, fetch_all: true)

require "frontapp"

module Frontapp
  class Client
    # New method: Get a single page of results with pagination info
    def list_page(path, params = {})
      # Extract page_token if provided
      page_token = params.delete(:page_token) || params.delete("page_token")

      # Build URL
      if page_token
        # Page token contains the full URL with params
        url = page_token
        params = {} # Clear params for pagination URLs
      else
        url = "#{base_url}/#{path}"
      end

      response = HTTParty.get(url, {
        body: params.to_json,
        headers: headers,
        format: :json
      })

      # Handle API errors
      raise Error.from_response(response) unless response.success?

      parsed = response.parsed_response
      results = parsed["_results"] || []
      pagination = parsed["_pagination"] || {}

      # Return structured response with pagination info
      {
        results: results,
        next_token: pagination["next"],
        has_more: !pagination["next"].nil?,
        total: results.length
      }
    end

    # Override the list method to respect max_results and fetch_all
    def list(path, params = {})
      # Extract control parameters
      max_results = params.delete(:max_results) || params.delete("max_results")
      fetch_all = params.delete(:fetch_all) || params.delete("fetch_all") || false

      # If fetch_all is true, use original behavior (fetch everything)
      if fetch_all
        return list_all_pages(path, params)
      end

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

    # Original behavior - fetch all pages (be careful!)
    def list_all_pages(path, params = {})
      items = []
      last_page = false
      url = "#{base_url}/#{path}"

      while !last_page
        response = HTTParty.get(url, {
          body: params.to_json,
          headers: headers,
          format: :json
        })

        raise Error.from_response(response) unless response.success?

        if block_given?
          yield response.parsed_response["_results"]
        else
          results = response.parsed_response["_results"] || []
          items.concat(results)
        end

        pagination = response.parsed_response["_pagination"]
        if pagination.nil? || pagination["next"].nil?
          last_page = true
        else
          url = pagination["next"]
          params = {}
        end

        # Safety limit
        break if items.length > 50000
      end

      items
    end

    # Add single-page methods for manual pagination

    def get_inbox_conversations_page(inbox_id, params = {})
      page_token = params[:page_token] || params["page_token"]
      limit = params[:limit] || params["limit"] || 25

      if page_token
        list_page(nil, page_token: page_token)
      else
        cleaned = params.permit({ q: [ :statuses ] })
        cleaned[:limit] = limit
        list_page("inboxes/#{inbox_id}/conversations", cleaned)
      end
    end

    def conversations_page(params = {})
      page_token = params[:page_token] || params["page_token"]
      limit = params[:limit] || params["limit"] || 25

      if page_token
        list_page(nil, page_token: page_token)
      else
        cleaned = params.permit({ q: [ :statuses ] })
        cleaned[:limit] = limit
        list_page("conversations", cleaned)
      end
    end

    # Override get_inbox_conversations to handle max_results and fetch_all
    alias_method :original_get_inbox_conversations, :get_inbox_conversations

    def get_inbox_conversations(inbox_id, params = {})
      # Preserve control params through the permit call
      max_results = params[:max_results] || params["max_results"]
      fetch_all = params[:fetch_all] || params["fetch_all"]

      cleaned = params.permit({ q: [ :statuses ] })
      cleaned[:max_results] = max_results if max_results
      cleaned[:fetch_all] = fetch_all if fetch_all

      list("inboxes/#{inbox_id}/conversations", cleaned)
    end

    # Override conversations method to handle max_results and fetch_all
    alias_method :original_conversations, :conversations

    def conversations(params = {})
      # Preserve control params through the permit call
      max_results = params[:max_results] || params["max_results"]
      fetch_all = params[:fetch_all] || params["fetch_all"]

      cleaned = params.permit({ q: [ :statuses ] })
      cleaned[:max_results] = max_results if max_results
      cleaned[:fetch_all] = fetch_all if fetch_all

      list("conversations", cleaned)
    end

    # Helper method for iterating through pages with a block
    def each_conversation_page(inbox_id, limit: 25, &block)
      page_token = nil

      loop do
        page = get_inbox_conversations_page(inbox_id, limit: limit, page_token: page_token)

        # Yield the page results to the block
        yield page[:results]

        # Check if there are more pages
        break unless page[:has_more]
        page_token = page[:next_token]
      end
    end
  end
end

# Log that the monkeypatch is loaded
Rails.logger.info "Frontapp monkeypatch loaded: Added max_results support and pagination methods"
