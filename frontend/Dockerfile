# Stage 1: Build
FROM node:20 AS build
WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the app (outputs to /app/build)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
