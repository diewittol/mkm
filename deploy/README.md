# Деплой на Ubuntu

Первый запуск на чистом сервере:

```bash
# 1. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
sudo corepack enable   # даёт yarn

# 2. Пользователь и папка приложения
sudo useradd -r -m -d /var/www/mkm mkm
sudo -u mkm git clone <URL_РЕПОЗИТОРИЯ> /var/www/mkm
cd /var/www/mkm

# 3. Зависимости и .env
sudo -u mkm yarn install --frozen-lockfile
sudo -u mkm cp .env.example .env
sudo -u mkm nano .env   # ADMIN_PASSWORD, AUTH_SECRET (openssl rand -hex 32)

# 4. База данных и сборка
sudo -u mkm npx prisma generate
sudo -u mkm npx prisma migrate deploy
sudo -u mkm yarn build

# 5. systemd
sudo cp deploy/mkm.service.example /etc/systemd/system/mkm.service
sudo systemctl daemon-reload
sudo systemctl enable --now mkm
sudo systemctl status mkm

# 6. nginx + HTTPS
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/mkm
sudo nano /etc/nginx/sites-available/mkm   # заменить your-domain.ru
sudo ln -s /etc/nginx/sites-available/mkm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

## Обновление после изменений в коде

```bash
cd /var/www/mkm
sudo -u mkm git pull
sudo -u mkm yarn install --frozen-lockfile
sudo -u mkm npx prisma generate
sudo -u mkm npx prisma migrate deploy
sudo -u mkm yarn build
sudo systemctl restart mkm
```

## Бэкапы

`prisma/dev.db`, `public/uploads/` и `private-uploads/` (закрытые фото
заказов) — единственные хранилища данных сайта, в git не попадают. Например, простой cron раз в сутки:

```bash
0 3 * * * tar -czf /var/backups/mkm-$(date +\%F).tar.gz -C /var/www/mkm prisma/dev.db public/uploads private-uploads
```
