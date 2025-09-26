FROM ruby:3.2

WORKDIR /app

# Install dependencies
RUN apt-get update -qq && apt-get install -y nodejs postgresql-client

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy app code
COPY . .

# Precompile assets if needed
# RUN bundle exec rake assets:precompile

EXPOSE 3000

CMD ["bash", "-c", "bundle exec rails db:migrate && bundle exec puma -C config/puma.rb"]
