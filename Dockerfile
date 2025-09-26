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

EXPOSE 3000

# Don't run migrations in CMD
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
