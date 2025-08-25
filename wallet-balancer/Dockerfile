FROM node:18-alpine

WORKDIR /app

# Copy everything (simple approach)
COPY . .

# Install dependencies and build
RUN yarn install
RUN yarn build

# Expose port
EXPOSE 3001

# Simple start command
CMD ["yarn", "start"]
