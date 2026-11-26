
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

COPY . .

# Backend URL for server-side requests
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=${BACKEND_URL}

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
