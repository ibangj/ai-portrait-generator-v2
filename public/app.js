document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerDuration = document.getElementById('timerDuration');
    const generatedImage = document.getElementById('generatedImage');
    const resultContainer = document.getElementById('resultContainer');
    const cameraInterface = document.getElementById('cameraInterface');
    const cameraPrompt = document.getElementById('cameraPrompt');
    const cameraSelect = document.getElementById('cameraSelect');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const qrCodeElement = document.getElementById('qrCode');

    // State
    let currentStep = 1;
    let selectedGender = '';
    let selectedPosition = '';
    let selectedVenue = '';
    let selectedExpression = '';
    let selectedFrame = '';
    let countdownInterval;
    let formData = new FormData();
    let currentStream = null;
    let progressInterval;
    let currentProgress = 0;

    // Initialize
    showStep(1);

    // Add camera selection change handler
    cameraSelect.addEventListener('change', () => {
        if (currentStream) {
            stopCamera();
        }
        startCamera();
    });

    async function getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Clear and update camera select options
            cameraSelect.innerHTML = '';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${cameraSelect.options.length + 1}`;
                cameraSelect.appendChild(option);
            });

            // If no camera is selected but we have devices, select the first one
            if (!cameraSelect.value && videoDevices.length > 0) {
                cameraSelect.value = videoDevices[0].deviceId;
            }
        } catch (error) {
            console.error('Error getting camera devices:', error);
        }
    }

    function openCamera() {
        cameraPrompt.classList.add('hidden');
        cameraInterface.classList.remove('hidden');
        
        // Get camera permissions and list devices
        navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1728 },
                height: { ideal: 1152 },
                facingMode: 'user'
            }
        })
            .then(stream => {
                // Keep this initial stream
                currentStream = stream;
                video.srcObject = stream;
                return video.play()
                    .then(() => getCameraDevices())
                    .then(() => {
                        // If a specific camera was selected and it's different from current one
                        const currentTrack = stream.getVideoTracks()[0];
                        const currentDeviceId = currentTrack.getSettings().deviceId;
                        if (cameraSelect.value && cameraSelect.value !== currentDeviceId) {
                            return startCamera();
                        }
                    });
            })
            .catch(err => {
                console.error('Error accessing camera:', err);
                if (err.name === 'NotAllowedError') {
                    alert('Camera access was denied. Please allow camera access in your browser settings and try again.');
                } else if (err.name === 'NotFoundError') {
                    alert('No camera found. Please make sure your camera is properly connected.');
                } else if (err.name === 'NotReadableError') {
                    alert('Camera is in use by another application. Please close other apps using the camera and try again.');
                } else {
                    alert('Unable to access camera. Please check your camera connection and permissions.');
                }
            });
    }

    async function startCamera() {
        try {
            if (currentStream) {
                stopCamera();
            }

            // Try different constraints in order of preference
            const constraints = [
                // 1. Try with ideal portrait resolution
                {
                    video: {
                        deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
                        width: { ideal: 1152 },
                        height: { ideal: 1728 },
                        facingMode: 'user'
                    }
                },
                // 2. Try with minimum portrait resolution
                {
                    video: {
                        deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
                        width: { min: 720 },
                        height: { min: 1280 },
                        facingMode: 'user'
                    }
                },
                // 3. Try with just device ID
                {
                    video: {
                        deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined
                    }
                },
                // 4. Try with no constraints
                { video: true }
            ];

            let lastError;
            for (const constraint of constraints) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraint);
                    currentStream = stream;
                    video.srcObject = stream;
                    
                    // Successfully got stream, break the loop
                    console.log('Camera started with constraints:', constraint);
                    return;
                } catch (err) {
                    console.warn('Failed to get stream with constraints:', constraint, err);
                    lastError = err;
                }
            }

            // If we get here, all constraints failed
            throw lastError;
        } catch (err) {
            console.error('Error starting camera:', err);
            if (err.name === 'NotAllowedError') {
                alert('Camera access was denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                alert('Selected camera not found. Please choose a different camera.');
            } else if (err.name === 'NotReadableError') {
                alert('Selected camera is in use by another application. Please close other apps using the camera.');
            } else if (err.name === 'OverconstrainedError') {
                alert('Your camera does not support the required resolution. Trying with default settings...');
                // Try one last time with no constraints
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    currentStream = stream;
                    video.srcObject = stream;
                } catch (finalErr) {
                    alert('Unable to access camera with any settings. Please try a different camera.');
                }
            } else {
                alert('Unable to start the selected camera. Please try another camera or check permissions.');
            }
        }

        // Ensure video plays when ready
        if (video.srcObject) {
            video.onloadedmetadata = () => {
                video.play().catch(err => {
                    console.error('Error playing video:', err);
                });
            };
        }
    }

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        if (video.srcObject) {
            video.srcObject = null;
        }
    }

    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });
        // Show current step
        document.getElementById(`step${step}`).classList.remove('hidden');
        currentStep = step;
    }

    function nextStep(step) {
        showStep(step);
    }

    function selectGender(gender) {
        selectedGender = gender;
        formData.append('gender', gender);
        // Update UI to show selection
        document.querySelectorAll('#step2 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === gender || 
                (gender === 'Female Hijabi' && btn.textContent === 'Female Wearing Hijab')) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(3), 300);
    }

    function selectPosition(position) {
        selectedPosition = position;
        formData.append('position', position);
        // Update UI to show selection
        document.querySelectorAll('#step3 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === position) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(4), 300);
    }

    function selectVenue(venue) {
        selectedVenue = venue;
        formData.append('setPanggung', venue);
        // Update UI to show selection
        document.querySelectorAll('#step4 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === venue) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(5), 300);
    }

    function selectExpression(expression) {
        selectedExpression = expression;
        formData.append('expression', expression);
        // Update UI to show selection
        document.querySelectorAll('#step5 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === expression) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(6), 300);
    }

    function selectFrame(frame) {
        selectedFrame = frame;
        
        // Clear any existing frame data from formData
        if (formData.has('selectedFrame')) {
            formData.delete('selectedFrame');
        }
        
        // Add new frame selection
        formData.append('selectedFrame', frame);
        
        // Update radio button state
        document.querySelectorAll('input[name="frame"]').forEach(radio => {
            if (radio.value === frame) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });
    }

    function retakePhoto() {
        cameraInterface.classList.add('hidden');
        cameraPrompt.classList.remove('hidden');
        stopCamera();
    }

    function capturePhoto() {
        const duration = parseInt(timerDuration.value);
        if (duration === 0) {
            takePicture();
        } else {
            startCountdown(duration);
        }
    }

    function startCountdown(duration) {
        let timeLeft = duration;
        timerDisplay.style.display = 'block';
        timerDisplay.textContent = timeLeft;
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            
            if (timeLeft === 0) {
                clearInterval(countdownInterval);
                timerDisplay.style.display = 'none';
                takePicture();
            }
        }, 1000);
    }

    function takePicture() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        stopCamera();
        showStep(8);
        submitPhoto();
    }

    function startProgressBar() {
        currentProgress = 0;
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting generation...';
        
        // Simulate progress in 4 stages
        const stages = [
            { progress: 25, text: 'Analyzing photo...' },
            { progress: 50, text: 'Applying AI transformation...' },
            { progress: 75, text: 'Adding artistic effects...' },
            { progress: 90, text: 'Finalizing portrait...' }
        ];
        
        let currentStage = 0;
        
        progressInterval = setInterval(() => {
            if (currentStage < stages.length) {
                const { progress, text } = stages[currentStage];
                if (currentProgress < progress) {
                    currentProgress++;
                    progressBar.style.width = `${currentProgress}%`;
                } else {
                    progressText.textContent = text;
                    currentStage++;
                }
            }
        }, 100);
    }

    function stopProgressBar(success = true) {
        clearInterval(progressInterval);
        currentProgress = 100;
        progressBar.style.width = '100%';
        progressText.textContent = success ? 'Portrait generated successfully!' : 'Generation failed';
    }

    function generateQRCode(imageUrl) {
        try {
            // Generate a unique ID for this image
            const imageId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Ensure we have a full URL for the QR code
            const fullUrl = new URL(window.location.href);
            fullUrl.pathname = '/share/' + imageId;
            const shareUrl = fullUrl.toString();

            // Clear previous QR code if any
            qrCodeElement.innerHTML = '';
            
            // Generate QR code with the share URL
            new QRCode(qrCodeElement, {
                text: shareUrl,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Store the image URL and ID mapping
            fetch('/store-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageId,
                    imageUrl: imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl
                })
            }).catch(error => {
                console.error('Error storing image mapping:', error);
                // Continue showing the result even if storing fails
            });
        } catch (error) {
            console.error('Error generating QR code:', error);
            document.getElementById('qrContainer').style.display = 'none';
        }
    }

    function downloadImage() {
        const imageUrl = document.getElementById('generatedImage').src;
        const fileName = `ai-portrait-${Date.now()}.png`;

        fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error downloading image:', error);
                alert('Failed to download image. Please try again.');
            });
    }

    function submitPhoto() {
        canvas.toBlob(blob => {
            formData.append('image', blob, 'captured-image.jpg');
            if (!formData.has('bandGenre')) {
                formData.append('bandGenre', 'rock');
            }

            // Start progress bar
            startProgressBar();

            fetch('/submit', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the image URL for sharing
                    const imageUrl = data.imageUrl;
                    generatedImage.src = imageUrl;
                    document.getElementById('resultMessage').textContent = data.message;
                    
                    // Wait for image to load before showing
                    generatedImage.onload = () => {
                        stopProgressBar(true);
                        
                        setTimeout(() => {
                            document.querySelector('.loading-animation').style.display = 'none';
                            resultContainer.classList.remove('hidden');
                            
                            // Generate QR code after showing the result
                            try {
                                generateQRCode(imageUrl);
                            } catch (error) {
                                console.error('Error in QR code generation:', error);
                                document.getElementById('qrContainer').style.display = 'none';
                            }
                        }, 500);
                    };

                    // Handle image load error
                    generatedImage.onerror = () => {
                        if (generatedImage.dataset.isStartingOver) return; // Prevent recursive error handling
                        console.error('Error loading generated image');
                        stopProgressBar(false);
                        alert('Error loading the generated image. Please try again.');
                        generatedImage.dataset.isStartingOver = 'true';
                        startOver();
                    };
                } else {
                    stopProgressBar(false);
                    alert('An error occurred: ' + data.message);
                    startOver();
                }
            })
            .catch(error => {
                stopProgressBar(false);
                console.error('Error:', error);
                alert('An unexpected error occurred. Please try again.');
                startOver();
            });
        });
    }

    function startOver() {
        formData = new FormData();
        selectedGender = '';
        selectedPosition = '';
        selectedVenue = '';
        selectedExpression = '';
        selectedFrame = '';
        
        // Stop camera if it's running
        stopCamera();
        
        // Reset UI elements
        document.querySelector('.loading-animation').style.display = 'block';
        resultContainer.classList.add('hidden');
        
        // Properly cleanup image element
        const generatedImage = document.getElementById('generatedImage');
        if (generatedImage) {
            generatedImage.onload = null;
            generatedImage.onerror = null;
            generatedImage.src = '';
            delete generatedImage.dataset.isStartingOver;
        }
        
        document.getElementById('resultMessage').textContent = '';
        if (qrCodeElement) {
            qrCodeElement.innerHTML = '';
        }
        
        // Reset camera interface
        cameraInterface.classList.add('hidden');
        cameraPrompt.classList.remove('hidden');
        
        // Clear progress
        clearInterval(progressInterval);
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting generation...';
        
        // Reset all selection buttons
        document.querySelectorAll('.outline-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Reset frame selection radio buttons
        document.querySelectorAll('input[name="frame"]').forEach(radio => {
            radio.checked = false;
        });
        
        // Show first step
        showStep(1);
    }

    // Expose functions to window for onclick handlers
    window.nextStep = nextStep;
    window.selectGender = selectGender;
    window.selectPosition = selectPosition;
    window.selectVenue = selectVenue;
    window.selectExpression = selectExpression;
    window.selectFrame = selectFrame;
    window.openCamera = openCamera;
    window.retakePhoto = retakePhoto;
    window.capturePhoto = capturePhoto;
    window.startOver = startOver;
    window.downloadImage = downloadImage;
}); 