# Guía de Despliegue - ERP Taller SaaS

## 🚀 Opciones de Despliegue

### 1. Vercel (Recomendado)

#### Configuración Inicial
1. **Crear cuenta en Vercel**
2. **Conectar repositorio de GitHub**
3. **Configurar proyecto**

#### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

#### Configuración de Build
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

#### Pasos de Despliegue
1. **Push a main branch**
2. **Vercel detecta cambios automáticamente**
3. **Build y deploy automático**
4. **Configurar dominio personalizado**

### 2. Netlify

#### Configuración Inicial
1. **Crear cuenta en Netlify**
2. **Conectar repositorio**
3. **Configurar build settings**

#### Build Settings
```yaml
Build command: npm run build
Publish directory: .next
Node version: 18
```

#### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
```

#### Pasos de Despliegue
1. **Conectar repositorio**
2. **Configurar variables de entorno**
3. **Deploy automático**
4. **Configurar dominio personalizado**

### 3. Railway

#### Configuración Inicial
1. **Crear cuenta en Railway**
2. **Conectar repositorio**
3. **Configurar variables de entorno**

#### Railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
```

### 4. Docker

#### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=erp_taller
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 5. VPS/Server

#### Configuración de Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y
```

#### Configuración de Nginx
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Configuración de PM2
```json
{
  "name": "erp-taller",
  "script": "npm",
  "args": "start",
  "cwd": "/var/www/erp-taller",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

#### Scripts de Despliegue
```bash
#!/bin/bash
# deploy.sh

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart PM2
pm2 restart erp-taller

# Reload Nginx
sudo nginx -s reload
```

## 🔧 Configuración de Base de Datos

### Supabase (Recomendado)

#### 1. Crear Proyecto
1. **Ir a Supabase Dashboard**
2. **Crear nuevo proyecto**
3. **Configurar región**
4. **Obtener credenciales**

#### 2. Ejecutar Migraciones
```sql
-- Ejecutar en Supabase SQL Editor
-- Ver archivo: SOLUCION_COMPLETA_FINAL.sql
```

#### 3. Configurar RLS
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Enable read access for authenticated users" 
ON public.customers FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.customers FOR INSERT 
TO authenticated WITH CHECK (true);
```

#### 4. Configurar Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
```

### PostgreSQL Local

#### 1. Instalar PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# Descargar desde postgresql.org
```

#### 2. Crear Base de Datos
```sql
CREATE DATABASE erp_taller;
CREATE USER erp_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE erp_taller TO erp_user;
```

#### 3. Ejecutar Migraciones
```bash
psql -U erp_user -d erp_taller -f supabase/migrations/001_initial_schema.sql
```

## 🌐 Configuración de Dominio

### 1. Configurar DNS
```
A     @      tu-ip-del-servidor
CNAME www    tu-dominio.com
```

### 2. Configurar SSL
```bash
# Con Certbot
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### 3. Configurar Redirects
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

## 📊 Monitoreo y Logs

### 1. Configurar Logs
```bash
# PM2 logs
pm2 logs erp-taller

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Configurar Monitoreo
```bash
# Instalar PM2 monitoring
pm2 install pm2-server-monit
```

### 3. Configurar Backup
```bash
#!/bin/bash
# backup.sh

# Backup de base de datos
pg_dump -U erp_user -h localhost erp_taller > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/erp-taller
```

## 🔒 Seguridad

### 1. Configurar Firewall
```bash
# UFW
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
```

### 2. Configurar HTTPS
```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

### 3. Configurar Rate Limiting
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }
    }
}
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error de Build
```bash
# Limpiar cache
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Error de Base de Datos
```bash
# Verificar conexión
npm run db:test

# Verificar migraciones
npm run db:migrate:status
```

#### 3. Error de Permisos
```bash
# Corregir permisos
sudo chown -R $USER:$USER /var/www/erp-taller
chmod -R 755 /var/www/erp-taller
```

#### 4. Error de Memoria
```bash
# Aumentar memoria de Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Logs de Debugging

#### 1. Habilitar Debug
```env
DEBUG=*
NODE_ENV=development
```

#### 2. Verificar Variables de Entorno
```bash
# Verificar variables
printenv | grep NEXT_PUBLIC
```

#### 3. Verificar Conexión a Base de Datos
```bash
# Test de conexión
npm run db:test
```

## 📈 Optimización

### 1. Optimización de Build
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@/components/ui']
  },
  images: {
    domains: ['tu-dominio.com']
  }
}
```

### 2. Optimización de Base de Datos
```sql
-- Crear índices
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_collections_date ON collections(collection_date);
CREATE INDEX idx_collections_status ON collections(status);
```

### 3. Optimización de Caching
```nginx
# Nginx caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 CI/CD

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm test
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to server
      run: |
        # Script de deploy personalizado
        ./scripts/deploy.sh
```

### 2. Scripts de Deploy
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy..."

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Restart services
pm2 restart erp-taller

echo "✅ Deploy completado"
```

---

**¡Despliegue exitoso!** 🎉

Para más información, consulta la [documentación completa](README.md).







