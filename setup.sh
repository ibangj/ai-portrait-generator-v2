#!/bin/bash

# Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Create necessary directories
echo "Creating directories..."
mkdir -p storage/images
mkdir -p uploads
chmod 755 storage uploads

# Install dependencies
echo "Installing project dependencies..."
npm install

# Setup PM2 startup script
echo "Setting up PM2 startup..."
sudo pm2 startup
pm2 start ecosystem.config.js --env production
pm2 save

# Install and setup Nginx
echo "Installing and configuring Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/ai-portrait-generator << EOF
server {
    listen 80;
    server_name \$host;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

    # Increase max file upload size
    client_max_body_size 10M;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/ai-portrait-generator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Setup firewall
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "Setup complete! Your app should be running now."
echo "Don't forget to:"
echo "1. Set up your domain name"
echo "2. Install SSL certificate using Certbot"
echo "3. Update your ComfyUI server URL in the environment variables" 