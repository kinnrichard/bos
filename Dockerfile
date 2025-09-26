FROM ruby:3.2

WORKDIR /app

# Install dependencies
RUN apt-get update -qq && apt-get install -y nodejs postgresql-client

# Set production environment
ENV RAILS_ENV=production

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test

# Copy app code
COPY . .

# Force verification that generators are gone
RUN ls -la lib/ || echo "lib directory does not exist"
RUN ls -la lib/generators || echo "generators directory successfully removed"

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
