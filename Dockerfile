# ---------- Etapa 1: build del frontend ----------
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias con cache de capa (solo se reinstala si cambian los locks)
COPY package.json package-lock.json ./
RUN npm ci

# Código fuente
COPY . .

# Vite hornea las variables VITE_* en el bundle en tiempo de build.
# Por defecto se usa /api/v2 (relativo) y nginx proxya al backend real.
ARG VITE_API_BASE_URL=/api/v2
ARG VITE_USE_MOCK=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build

# ---------- Etapa 2: servir con nginx ----------
FROM nginx:1.27-alpine

# Puerto interno del contenedor y destino del proxy /api/v2
ENV NGINX_PORT=5176
ENV API_UPSTREAM=http://138.118.105.246:3001

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5176

# La imagen oficial procesa /etc/nginx/templates/*.template con envsubst al arrancar
