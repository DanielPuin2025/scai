# Dockerfile optimizado para SCAI en EasyPanel
FROM node:22-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY bun.lock* ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Build para producción con node-server preset
RUN npm run build:node

# Etapa de producción
FROM node:22-alpine

WORKDIR /app

# Copiar solo lo necesario desde builder
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package*.json ./

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", ".output/server/index.mjs"]
