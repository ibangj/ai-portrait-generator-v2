require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch').default;
const FormData = require('form-data');
const StorageCleanup = require('./utils/cleanup');
const http = require('http');

const app = express();

// Create storage directories if they don't exist
const storagePath = path.join(__dirname, 'storage');
const imagesPath = path.join(storagePath, 'images');

if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath);
}
if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// In-memory store for image mappings (in production, use a database)
const imageStore = new Map();

app.use(express.json());
app.use(express.static('public'));
// Serve stored images
app.use('/storage/images', express.static(imagesPath));

// Define a route for serving images
app.get('/images/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    res.sendFile(path.join(__dirname, 'public/images', imageName));
});

// Store image mapping and save image
app.post('/store-image', express.json(), async (req, res) => {
    try {
        const { imageId, imageUrl } = req.body;
        
        if (!imageId || !imageUrl) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check if image already exists in store
        const existingUrl = imageStore.get(imageId);
        if (existingUrl) {
            console.log(`Image already exists: ${imageId} -> ${existingUrl}`);
            return res.json({ 
                success: true,
                localUrl: existingUrl
            });
        }

        // Download image from ComfyUI server
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const buffer = await response.buffer();
        const fileName = `${imageId}.png`;
        const filePath = path.join(imagesPath, fileName);
        
        // Check if file already exists on disk
        if (!fs.existsSync(filePath)) {
            // Save image to storage only if it doesn't exist
            fs.writeFileSync(filePath, buffer);
            
            // Store mapping with local URL
            const localUrl = `/storage/images/${fileName}`;
            imageStore.set(imageId, localUrl);
            
            console.log(`Stored new image mapping: ${imageId} -> ${localUrl}`);
        }
        
        res.json({ 
            success: true,
            localUrl: `/storage/images/${fileName}`
        });
    } catch (error) {
        console.error('Error storing image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to store image'
        });
    }
});

// Share endpoint
app.get('/share/:imageId', (req, res) => {
    const { imageId } = req.params;
    const imageUrl = imageStore.get(imageId);
    
    if (!imageUrl) {
        return res.status(404).send('Image not found');
    }

    // Get the full URL for the image
    const protocol = req.secure ? 'https' : 'http';
    const fullImageUrl = `${protocol}://${req.get('host')}${imageUrl}`;

    // Send a simple HTML page with the image and download button
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Portrait</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background-color: #f0f2f5;
                }
                .container {
                    max-width: 500px;
                    width: 100%;
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                }
                img {
                    max-width: 100%;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #3b82f6;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 10px;
                }
                .button:hover {
                    background-color: #2563eb;
                }
                .button-group {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>AI Portrait</h1>
                <img src="${fullImageUrl}" alt="AI Portrait">
                <div class="button-group">
                    <a href="${fullImageUrl}" download="ai-portrait.png" class="button">Download Portrait</a>
                    <a href="/" class="button">Create Your Own</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ComfyUI WebSocket setup
const ws = new WebSocket('ws://38.147.83.29:27194/ws');

ws.on('open', function open() {
    console.log('Connected to ComfyUI WebSocket');
});

ws.on('message', function incoming(data) {
    console.log('Received:', data);
    // Handle ComfyUI messages here
});

async function uploadImageToComfyUI(imagePath, maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const fileName = path.basename(imagePath);
            console.log(`[${attempt}] Attempting to upload image: ${fileName}`);

            // Check if file exists
            if (!fs.existsSync(imagePath)) {
                throw new Error(`File does not exist: ${imagePath}`);
            }

            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath), {
                filename: fileName,
                contentType: 'image/png' // Adjust this based on your image type
            });

            console.log(`[${attempt}] Sending POST request to ComfyUI upload endpoint`);
            const uploadResponse = await fetch('http://38.147.83.29:27194/upload/image', {
                method: 'POST',
                body: form,
                timeout: 60000 // 60 seconds timeout
            });

            console.log(`[${attempt}] Received response from ComfyUI upload endpoint. Status: ${uploadResponse.status}`);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Image upload failed: ${uploadResponse.status} ${errorText}`);
            }

            const uploadResult = await uploadResponse.json();
            console.log(`[${attempt}] Image upload successful. Result:`, uploadResult);

            return uploadResult.name || fileName;
        } catch (error) {
            console.error(`[ERROR] Attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function processWithComfyUI(imagePath, fullName, gender, position, setPanggung, expression, bandGenre, selectedFrame) {
    try {
        console.log(`[1] Starting processWithComfyUI`);
        const uploadedImageName = await uploadImageToComfyUI(imagePath);
        console.log(`[2] Image uploaded successfully. Uploaded name: ${uploadedImageName}`);

        let uploadedFrame;
        if (selectedFrame) {
            const framePath = path.join(__dirname, 'public', 'images', `${selectedFrame}.png`);
            try {
                if (fs.existsSync(framePath)) {
                    uploadedFrame = await uploadImageToComfyUI(framePath);
                    console.log(`[3] Frame uploaded successfully. Uploaded name: ${uploadedFrame}`);
                } else {
                    console.warn(`[WARNING] Frame file not found: ${framePath}`);
                    uploadedFrame = "sample_frame.png"; // Default frame if file not found
                }
            } catch (frameUploadError) {
                console.error(`[ERROR] Failed to upload frame. Using default frame.`, frameUploadError);
                uploadedFrame = "sample_frame.png"; // Default frame if upload fails
            }
        } else {
            console.log(`[3] No frame selected, using default frame`);
            const defaultFramePath = path.join(__dirname, 'public', 'images', 'sample_frame.png');
            if (fs.existsSync(defaultFramePath)) {
                uploadedFrame = await uploadImageToComfyUI(defaultFramePath);
            } else {
                uploadedFrame = "sample_frame.png";
            }
        }

        console.log(`[4] Reading workflow file`);
        const workflowRaw = fs.readFileSync(path.join(__dirname, 'workflow_api.json'), 'utf8');
        let workflow = JSON.parse(workflowRaw);

        console.log(`[5] Modifying workflow based on user input`);
        workflow["11"].inputs.image = uploadedImageName;
        workflow["29"].inputs.text_1 = `${gender} ${position} of a ${bandGenre} band`;
        workflow["29"].inputs.text_2 = `performing a concert with ${expression} expression`;
        workflow["29"].inputs.text_3 = `at a ${setPanggung}`;
        workflow["29"].inputs.text_6 = `${position} in foreground`;
        workflow["38"].inputs.image = uploadedFrame;

        const requestBody = {
            prompt: workflow,
            client_id: `test_${Date.now()}`
        };

        console.log(`[6] Sending workflow to ComfyUI`);
        const response = await fetch('http://38.147.83.29:27194/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log(`[7] Received response from ComfyUI prompt endpoint. Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ERROR] ComfyUI response not OK. Status: ${response.status}, Response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[8] ComfyUI prompt response:`, JSON.stringify(data, null, 2));

        // Wait for the image to be generated
        const promptId = data.prompt_id;
        const outputImageUrl = await waitForImageGeneration(promptId);
        console.log(`[9] Image generation complete. Output image URL:`, outputImageUrl);

        return outputImageUrl;
    } catch (error) {
        console.error(`[ERROR] Error in processWithComfyUI:`, error);
        throw error;
    }
}

async function waitForImageGeneration(promptId) {
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                const historyResponse = await fetch(`http://38.147.83.29:27194/history/${promptId}`);
                const historyData = await historyResponse.json();

                if (historyData[promptId] && historyData[promptId].outputs && historyData[promptId].outputs["20"]) {
                    const outputImage = historyData[promptId].outputs["20"].images[0];
                    const originalUrl = `http://38.147.83.29:27194/view?filename=${outputImage.filename}&subfolder=${outputImage.subfolder}&type=${outputImage.type}`;
                    // Return proxied URL instead
                    resolve(`/proxy-image?url=${encodeURIComponent(originalUrl)}`);
                } else {
                    setTimeout(checkStatus, 1000);
                }
            } catch (error) {
                reject(error);
            }
        };

        checkStatus();
    });
}

// Placeholder function for uploading to Google Drive (kept optional)
async function uploadToGoogleDrive(imagePath) {
    // ... (keep your existing Google Drive upload code)
}

// Form submission endpoint
app.post('/submit', upload.single('image'), async (req, res) => {
    const { fullName, email, gender, position, setPanggung, expression, bandGenre, selectedFrame } = req.body;
    const imagePath = req.file.path;

    console.log('Received form data:', { fullName, email, gender, position, setPanggung, expression, bandGenre, selectedFrame });

    try {
        // Process image with ComfyUI
        const generatedImageUrl = await processWithComfyUI(imagePath, fullName, gender, position, setPanggung, expression, bandGenre, selectedFrame);

        res.json({
            success: true,
            message: 'Portrait generated successfully!',
            imageUrl: generatedImageUrl
        });
    } catch (error) {
        console.error('[ERROR] Error in /submit endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during image processing. Please try again.',
            error: error.message
        });
    } finally {
        // Clean up the uploaded file
        try {
            fs.unlinkSync(imagePath);
            console.log(`[CLEANUP] Removed temporary file: ${imagePath}`);
        } catch (unlinkError) {
            console.error(`[CLEANUP ERROR] Failed to remove temporary file: ${imagePath}`, unlinkError);
        }
    }
});

// Initialize cleanup service
const cleanupService = new StorageCleanup({
    storageDir: imagesPath,
    maxAgeInDays: 7,
    maxSizeInGB: 5
});

// Start the cleanup job to run every hour
cleanupService.startCleanupJob(60);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Cleaning up...');
    cleanupService.stopCleanupJob();
    process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add these new endpoints before your existing routes
app.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('No image URL provided');
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Forward the content type
        res.set('Content-Type', response.headers.get('content-type'));
        
        // Pipe the image data to response
        response.body.pipe(res);
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).send('Error fetching image');
    }
});