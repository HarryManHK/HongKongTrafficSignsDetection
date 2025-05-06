// Get elements
const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const cameraSelect = document.getElementById('cameraSelect');
const socket = io('https://d.harryman.cc/'); // Automatically connects to the server that served the page

// Store the media stream globally so we can stop it later
let currentStream;

// Global variable to hold the interval ID for video processing
let videoProcessingInterval;

// Function to stop all tracks of the current stream
function stopMediaTracks(stream) {
    stream.getTracks().forEach(track => {
        track.stop();
    });
}

// Function to start the video stream with the selected camera
function startVideoStream(deviceId) {
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            // Stop previous stream if exists
            if (currentStream) {
                stopMediaTracks(currentStream);
            }

            currentStream = stream;
            video.srcObject = stream;
            video.play();

            // Use 'onloadedmetadata' to ensure only one event listener is active
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                processVideo();
            };
        })
        .catch((err) => {
            console.error("Cannot access camera:", err);
            let errorMessage = "Cannot open the camera.";

            switch (err.name) {
                case "NotFoundError":
                    errorMessage = "No camera device found.";
                    break;
                case "NotAllowedError":
                    errorMessage = "Camera access denied.";
                    break;
                case "NotReadableError":
                    errorMessage = "Cannot read camera device.";
                    break;
                case "OverconstrainedError":
                    errorMessage = "Camera settings not supported.";
                    break;
                default:
                    errorMessage = "Cannot open the camera.";
            }

            alert(errorMessage);
        });
}

// Function to list cameras and populate the select dropdown
function getCameraOptions() {
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            // Clear existing options
            cameraSelect.innerHTML = '';

            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            // Start stream with the first available camera by default
            if (videoDevices.length > 0) {
                startVideoStream(videoDevices[0].deviceId);
            } else {
                alert("No camera devices found.");
            }
        })
        .catch((err) => {
            console.error("Error enumerating devices:", err);
        });
}

// Event listener for camera selection change
cameraSelect.addEventListener('change', (event) => {
    const selectedDeviceId = event.target.value;
    startVideoStream(selectedDeviceId);
});

// SpeechSynthesis API
let canSpeak = true; // Debounce flag to prevent overly frequent speech alerts
let speechAlertsEnabled = true; // Initially enabled

function playAlert(alertText) {
    if (!alertText || !speechAlertsEnabled || !canSpeak) return; // Prevent empty alerts and respect user preference

    canSpeak = false;
    const utterance = new SpeechSynthesisUtterance(alertText);
    utterance.lang = 'zh-HK'; // Set language to Traditional Chinese (Hong Kong)
    utterance.pitch = 1; // Pitch
    utterance.rate = 1; // Rate
    speechSynthesis.speak(utterance);

    // Allow speaking again after speech ends
    utterance.onend = () => {
        canSpeak = true;
    };
}

// Draw rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
}

// Process video frames
function processVideo() {
    const frameInterval = 100; // milliseconds, about 10 frames per second

    // Clear any existing interval to prevent multiple intervals
    if (videoProcessingInterval) {
        clearInterval(videoProcessingInterval);
    }

    videoProcessingInterval = setInterval(() => {
        // Draw video frame onto canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get image data from canvas
        const imageData = canvas.toDataURL('image/jpeg', 0.5);
        // Send image data to server
        socket.emit('image', imageData.split(',')[1]);
    }, frameInterval);
}

// Track displayed signs and their timeouts
const signTimeouts = {};

// Add traffic sign to alert bar
function addTrafficSign(signSrc, altText, alertMessage, isSpeedLimit = false) {
    const alertBar = document.getElementById('alertBar');

    // Check if the sign already exists
    let existingSign = Array.from(alertBar.getElementsByTagName('img')).find(img => img.alt === altText);

    if (existingSign) {
        // If exists, reset its timeout
        if (signTimeouts[altText]) {
            clearTimeout(signTimeouts[altText]);
        }
        // Set a new timeout to remove the sign after 10 seconds
        signTimeouts[altText] = setTimeout(() => {
            if (alertBar.contains(existingSign)) {
                alertBar.removeChild(existingSign);
            }
            delete signTimeouts[altText];
        }, 10000); // 10 seconds
    } else {
        // If not exists, create a new image element
        const img = document.createElement('img');
        img.src = signSrc;
        img.alt = altText;
        img.classList.add('alert-sign');

        // Optional: add click event to provide more information
        img.addEventListener('click', () => {
            alert(`Alert: ${altText}`);
        });

        // Add the image to the alert bar
        alertBar.appendChild(img);

        // Set a timeout to remove the sign after 10 seconds
        signTimeouts[altText] = setTimeout(() => {
            if (alertBar.contains(img)) {
                alertBar.removeChild(img);
            }
            delete signTimeouts[altText];
        }, 10000); // 10 seconds

        // Only trigger speech alert for new signs
        playAlert(alertMessage);
    }
}

// Receive detection results from the server
socket.on('detections', (data) => {
    const detections = data.detections;
    // Clear and redraw the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Set text baseline for better text positioning
    context.textBaseline = "top";

    // Track detected traffic signs
    const detectedSigns = [];

    detections.forEach((det) => {
        // Draw bounding box
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 10;
        context.shadowOffsetX = 4;
        context.shadowOffsetY = 4;

        // Set stroke properties
        context.lineWidth = 8; // Thicker border
        context.strokeStyle = '#FF0000'; // Bright red
        // Draw rounded bounding box
        drawRoundedRect(context, det.xmin, det.ymin, det.xmax - det.xmin, det.ymax - det.ymin, 10); // 10px radius

        // Reset shadow properties
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

        // Prepare label
        const label = det.distance ? `${det.name} ${det.distance.toFixed(2)} m` : `${det.name} ${(det.confidence * 100).toFixed(1)}%`;
        context.font = "bold 24px Arial"; // Larger font size and bold
        const textWidth = context.measureText(label).width;
        const textHeight = 24; // Match font size

        // Draw text background rectangle
        context.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Semi-transparent red
        context.fillRect(det.xmin + 5, det.ymin > textHeight + 10 ? det.ymin - textHeight - 10 : det.ymin + 5, textWidth + 10, textHeight + 5);

        // Draw text
        context.fillStyle = 'white'; // White text
        context.fillText(label, det.xmin + 10, det.ymin > textHeight + 10 ? det.ymin - textHeight + 5 : det.ymin + 10);

        // Check if the detected object is a traffic sign
        const trafficSignClasses = [
            '300mtoleftexit', 'dangerous', 'noparkingend', 'noparkinggreen',
            'noparkingred', 'noparkingyellow', 'roadnarrowsblocked',
            'roadnarrowsboth', 'roadnarrowsright', 'speed50km', 'speed70km',
            'speed80km', 'speed100km', 'speed110km', 'roadworks'
        ];

        if (trafficSignClasses.includes(det.name.toLowerCase())) {
            detectedSigns.push(det.name.toLowerCase()); // Store in lowercase
        }
    });

    // Add traffic signs to the alert bar and trigger speech alerts
    detectedSigns.forEach(signName => {
        let signSrc = '';
        let altText = '';
        let alertMessage = '';
        let isSpeedLimit = false;

        // Map sign names to image sources and alert messages
        switch (signName) {
            case '300mtoleftexit':
                signSrc = 'assets/300mToLeftExit.png';
                altText = '300米左側出口';
                alertMessage = "距離300米左側出口"; // "300 meters to the left exit"
                break;
            case 'dangerous':
                signSrc = 'assets/Dangerous.png';
                altText = '危險';
                alertMessage = '前方有危險！請小心駕駛。'; // "Danger ahead! Please drive carefully."
                break;
            case 'noparkingend':
                signSrc = 'assets/NoParkingEnd.png';
                altText = '禁止停車區域結束';
                alertMessage = '禁止停車區域結束。'; // "No Parking Zone Ends."
                break;
            case 'noparkinggreen':
                signSrc = 'assets/NoParkingGreen.png';
                altText = '禁止停車（綠色標誌）';
                alertMessage = '禁止停車（綠色標誌）。'; // "No Parking (Green Sign)."
                break;
            case 'noparkingred':
                signSrc = 'assets/NoParkingRed.png';
                altText = '禁止停車（紅色標誌）';
                alertMessage = '禁止停車（紅色標誌）。'; // "No Parking (Red Sign)."
                break;
            case 'noparkingyellow':
                signSrc = 'assets/NoParkingYellow.png';
                altText = '禁止停車（黃色標誌）';
                alertMessage = '禁止停車（黃色標誌）。'; // "No Parking (Yellow Sign)."
                break;
            case 'roadnarrowsblocked':
                signSrc = 'assets/RoadNarrowsBlocked.png';
                altText = '前方道路收窄並被阻塞';
                alertMessage = '前方道路收窄並被阻塞。'; // "Road narrows and is blocked ahead."
                break;
            case 'roadnarrowsboth':
                signSrc = 'assets/RoadNarrowsBoth.png';
                altText = '前方道路雙側收窄';
                alertMessage = '前方道路雙側收窄。'; // "Road narrows on both sides ahead."
                break;
            case 'roadnarrowsright':
                signSrc = 'assets/RoadNarrowsRight.png';
                altText = '前方道路右側收窄';
                alertMessage = '前方道路右側收窄。'; // "Road narrows on the right ahead."
                break;
            case 'speed50km':
                signSrc = 'assets/Speed50km.png';
                altText = '前方限速50公里';
                alertMessage = '前方限速50公里。'; // "Speed limit 50 km/h ahead."
                isSpeedLimit = true;
                break;
            case 'speed70km':
                signSrc = 'assets/Speed70km.png';
                altText = '前方限速70公里';
                alertMessage = '前方限速70公里。'; // "Speed limit 70 km/h ahead."
                isSpeedLimit = true;
                break;
            case 'speed80km':
                signSrc = 'assets/Speed80km.png';
                altText = '前方限速80公里';
                alertMessage = '前方限速80公里。'; // "Speed limit 80 km/h ahead."
                isSpeedLimit = true;
                break;
            case 'speed100km':
                signSrc = 'assets/Speed100km.png';
                altText = '前方限速100公里';
                alertMessage = '前方限速100公里。'; // "Speed limit 100 km/h ahead."
                isSpeedLimit = true;
                break;
            case 'speed110km':
                signSrc = 'assets/Speed110km.png';
                altText = '前方限速110公里';
                alertMessage = '前方限速110公里。'; // "Speed limit 110 km/h ahead."
                isSpeedLimit = true;
                break;
            case 'roadworks':
                signSrc = 'assets/RoadWork.png';
                altText = '前方有道路工程';
                alertMessage = '前方有道路工程。'; // "Roadworks ahead."
                break;
            default:
                console.warn(`Unknown traffic sign detected: ${signName}`);
                return; // Skip unknown signs
        }

        // Add traffic sign to the alert bar and trigger speech alert
        addTrafficSign(signSrc, altText, alertMessage, isSpeedLimit);
    });
});

// Debug: Check Socket.io connection
socket.on('connect', () => {
    console.log('Connected to Socket.io server');
});

socket.on('connect_error', (error) => {
    console.error('Connection Error:', error);
});

// Geolocation and current speed
document.addEventListener('DOMContentLoaded', () => {
    getCameraOptions();

    const locationElement = document.getElementById('geolocation');
    const speedElement = document.getElementById('speed');

    let previousPosition = null;
    let previousTimestamp = null;

    // Check if the browser supports geolocation
    if ('geolocation' in navigator) {
        // Use watchPosition to continuously listen to position changes
        navigator.geolocation.watchPosition(async (position) => {
            const { latitude, longitude, speed } = position.coords;
            const timestamp = position.timestamp;

            // Display latitude and longitude
            locationElement.textContent = `緯度: ${latitude.toFixed(4)}, 經度: ${longitude.toFixed(4)}`;

            // Handle speed
            if (speed !== null && !isNaN(speed)) {
                // If the device directly provides speed, use it
                const speedKmh = (speed * 3.6).toFixed(2); // Convert m/s to km/h
                speedElement.textContent = `速度: ${speedKmh} km/h`;
            } else if (previousPosition && previousTimestamp) {
                // If the device doesn't provide speed, calculate it manually
                const timeDelta = (timestamp - previousTimestamp) / 1000; // seconds
                const distance = getDistanceFromLatLonInKm(
                    previousPosition.latitude,
                    previousPosition.longitude,
                    latitude,
                    longitude
                );
                const speedKmh = (distance / timeDelta) * 3600; // km/h
                speedElement.textContent = `速度: ${speedKmh.toFixed(2)} km/h`;
            } else {
                // Initial speed
                speedElement.textContent = `速度: 0 km/h`;
            }

            // Update previous position and time
            previousPosition = { latitude, longitude };
            previousTimestamp = timestamp;

            try {
                // Use Nominatim API for reverse geocoding to get street name
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                if (!response.ok) {
                    throw new Error('Reverse geocoding failed');
                }
                const data = await response.json();
                const address = data.address;
                const street = address.road || address.pedestrian || address.cycleway || address.street || '未知街道';
                locationElement.textContent += ` | 街道: ${street}`;
            } catch (error) {
                console.error(error);
                locationElement.textContent += ' | 無法獲取街道名稱';
            }
        }, (error) => {
            console.error(error);
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    locationElement.textContent = '位置權限被拒絕。';
                    speedElement.textContent = '速度: N/A';
                    break;
                case error.POSITION_UNAVAILABLE:
                    locationElement.textContent = '無法獲取位置資訊。';
                    speedElement.textContent = '速度: N/A';
                    break;
                case error.TIMEOUT:
                    locationElement.textContent = '獲取位置超時。';
                    speedElement.textContent = '速度: N/A';
                    break;
                default:
                    locationElement.textContent = '獲取位置時發生未知錯誤。';
                    speedElement.textContent = '速度: N/A';
            }
        }, {
            enableHighAccuracy: true, // Increase accuracy
            maximumAge: 1000, // Maximum interval between position updates
            timeout: 5000 // Timeout for getting position
        });
    } else {
        locationElement.textContent = '您的瀏覽器不支持地理定位。';
        speedElement.textContent = '速度: N/A';
    }

    /**
     * Calculate the distance between two lat/lon points (using Haversine formula)
     * @param {number} lat1
     * @param {number} lon1
     * @param {number} lat2
     * @param {number} lon2
     * @returns {number} Distance in kilometers
     */
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    }

    /**
     * Convert degrees to radians
     * @param {number} deg
     * @returns {number} Radians
     */
    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
});