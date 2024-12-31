# AI Portrait Generator 🎨

[![AI Portrait Generator Demo](https://img.youtube.com/vi/YcAJ8-b8KHI/0.jpg)](https://www.youtube.com/watch?v=YcAJ8-b8KHI)

An interactive web application that generates AI-enhanced portraits using ComfyUI backend processing.

## 🌟 Features

- Multi-step photo capture process
- Real-time camera integration
- Custom portrait generation based on:
  - Gender selection
  - Position/pose
  - Venue background
  - Expression
  - Frame style
- QR code generation for easy sharing
- Progress tracking during image processing
- Responsive design

## 🛠️ Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Image Processing: ComfyUI
- WebSocket for real-time communication
- Email integration for sharing

## 📋 Prerequisites

- Node.js 18.x or higher
- PM2 (for production deployment)
- Nginx (for production deployment)
- ComfyUI server

## 🚀 Installation

1. Clone the repository:  
`bash`  
`git clone https://github.com/yourusername/ai-portrait-generator.git`  
`cd ai-portrait-generator`

3. Install dependencies:  
`bash`  
`npm install`

4. Run the setup script:  
`bash`  
`chmod +x setup.sh`  
`./setup.sh`

## ⚙️ Configuration

1. Create a `.env` file in the root directory:  
`plaintext`  
`COMFYUI_HOST=your_comfyui_host`  
`COMFYUI_PORT=8188`  
`NODE_ENV=production`  
`PORT=3000`  

2. Configure PM2 using ecosystem.config.js (already included)

## 📁 Project Structure

ai-portrait-generator/  
├── public/  
│ ├── app.js  
│ ├── index.html  
│ ├── styles.css  
│ └── images/  
├── storage/  
│ └── images/  
├── uploads/  
├── server.js  
├── ecosystem.config.js  
├── setup.sh  
├── package.json  
└── .env  

## 🔒 Security Features

- File upload restrictions
- Secure WebSocket connections
- Firewall configuration
- SSL/TLS support

## 🌐 Production Deployment

1. Update Nginx configuration
2. Set up SSL certificate using Certbot:  
`bash`  
`sudo certbot --nginx -d yourdomain.com`  

3. Configure domain settings
4. Update ComfyUI server URL in environment variables

## 🧹 Maintenance

- Regular cleanup of temporary files
- Monitor server resources
- Keep dependencies updated
- Check logs for errors

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ Important Notes

- Ensure ComfyUI server is properly configured and running
- Regular maintenance of storage directory is recommended
- Monitor server resources for optimal performance
- Keep Node.js and dependencies updated

## 📞 Support

For support, please open an issue in the repository or contact the maintainers.
