# Hong Kong Traffic Signs Detection

## Introduction
In recent years, Hong Kong has witnessed a troubling upward trend in illegal parking incidents and traffic accidents.
Between 2020 and 2024, Hong Kong has faced increasing challenges related to traffic safety and illegal parking. According to the Hong Kong Police Force, traffic accidents involving personal injuries have shown a concerning upward trend. In 2020, there were approximately 18,360 traffic accidents, resulting in 97 fatalities, 2,021 serious injuries, and 16,242 minor injuries. Over the subsequent years, the number of incidents fluctuated but remained high, with 2024 alone recording 12,850 such incidents from January to September across various police regions (Hong Kong Police Force).

Illegal parking has also been a persistent issue from 2020 to 2023. In 2020, authorities issued around 2.7 million fixed penalty tickets for parking violations. This number saw a gradual decrease in the following years, with approximately 2.5 million tickets in 2021, 2.4 million in 2022, and about 2.3 million in the first three quarters of 2023 (Hong Kong Police Force). Despite these reductions, illegal parking continues to contribute significantly to traffic congestion and poses risks to public safety by obstructing emergency vehicle routes.

To address these pressing issues, I developed Smart Car Cam, a user-friendly website designed to improve road safety and enforce traffic rules in real time. Smart Car Cam uses camera technology to quickly detect important traffic signs, such as dangerous warning signs and no-parking signs specific to Hong Kong. When a sign is detected, the system gives an immediate audio alert to remind drivers to pay attention and follow the rules. Additionally, Smart Car Cam records the detected signs, ensuring that drivers can see the signs even in poor weather conditions.

At the heart of Smart Car Cam is YOLOv8, a powerful artificial intelligence tool known for its excellent ability to recognize objects. YOLOv8 allows our system to accurately and quickly identify traffic signs, ensuring real-time monitoring and prompt responses. By using this advanced AI technology, Smart Car Cam can reliably help reduce the number of accidents and illegal parking incidents.

By combining easy-to-use technology with smart safety features, Smart Car Cam aims to make Hong Kong’s roads safer and more efficient for everyone.

## Problem Formulation
### Issues with Current Situation
1. **The driver has not seen that roadworks was in progress.**
   - Drivers often miss noticing roadwork signs, especially in busy or congested areas, which can lead to sudden lane changes, confusion, or even accidents. This issue becomes worse during bad weather, nighttime, or when the signs are not clearly visible. Missing these warnings can put both the driver and road workers at risk, leading to traffic disruptions and increasing the likelihood of collisions. Without a reliable way to alert drivers to these changes in real-time, the safety of everyone on the road is compromised.

   **Solution:**
   - Real-time Detection of Traffic Signs: The website can quickly and accurately find important traffic signs (32 object classes), alerting the user to drive carefully and follow the rules.
   - Recording Traffic Signs for Review: The system saves detected signs automatically for later review.
   - Instant Alerts for Drivers: An audio alert system immediately warns drivers when a sign is detected.
   - Live GPS Location: Provides the current location and speed.
   - Car Distance Detection: Detects the front car distance and alerts the driver to keep a safe distance.

2. **The driver doesn’t know where parking is not allowed.**
   - Many drivers are unaware of designated no-parking zones, resulting in frequent parking violations. This contributes to congestion, blocks emergency routes, and leads to fines. The lack of clear visibility or understanding of no-parking areas is especially problematic in high-density regions like Hong Kong.

   **Solution:**
   - Real-time Detection of No Parking Signs: The website can auto-detect four types of no-parking traffic signs in Hong Kong and alert the driver to avoid restricted areas.

## Methodology
### Software
- **Ultralytics YOLOv8**: Used for real-time object detection. The model was trained on about 2,300 images for over 800 epochs, achieving strong accuracy for 32 traffic sign classes. Monocular Distance Estimation is used for car/bus distance calculation.
- **OpenCV (Python)**: Handles image decoding, drawing bounding boxes, extracting regions of interest (ROI), and encoding images for transmission.
- **EasyOCR (Python)**: Recognizes text from detected traffic signs, using deep learning for robust performance in real-world conditions.
- **Flask & Flask-SocketIO**: Used to build the backend web application and enable real-time, bidirectional communication.
- **SpeechSynthesis API**: Provides real-time audio alerts to drivers in the browser.
- **GPS Geolocation API**: Tracks and displays user location and speed in the web interface, using browser APIs and reverse geocoding for street names.

### Hardware
- The system architecture includes a GPU server for inference and a client-side web application, communicating via web sockets over mobile wireless networks.

## Findings & Results
The Smart Car Cam system can clearly identify 32 different traffic signs, detect bus and car distances, and provide instant audio alerts. Detected signs are recorded for later review, and current geo-location and street names are displayed. The project demonstrates reliable, real-time detection and user feedback, supporting safer driving and better enforcement of traffic rules.

## Summary
The Smart Car Cam system helps make Hong Kong’s roads safer and reduces illegal parking. It uses YOLOv8 and EasyOCR to recognize traffic signs and give quick audio warnings, preventing accidents when drivers miss important signs. The system detects no-parking signs in real time, helping stop illegal parking, especially in busy areas. With GPS tracking and distance measurement, drivers become more aware and drive more safely. The project successfully combines AI and web technologies, showing potential for real-world deployment. Future improvements could include adding more traffic signs and integrating with government APIs for enhanced verification.

## Features
- Real-time traffic sign detection
- Web-based interface
- Supports GPU server for accelerated inference
- GPS location and OBS camera integration

## Getting Started

### Prerequisites
- Node.js and npm installed
- Access to a GPU server (or run locally)
- Modern web browser

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/HongKongTrafficSignsDetection.git
   cd HongKongTrafficSignsDetection
   ```

## Usage
1. Edit the JavaScript file to set the correct server URL for socket.io. In your JS file (e.g., `main.js`), update line 6 as follows:
   ```javascript
   // For GPU server
   const socket = io('https://d.harryman.cc/'); // Automatically connects to the server that served the page
   // For local server
   // const socket = io('http://127.0.0.1:5050/');
   ```
2. Start your web server (e.g., with Python):
   ```bash
   python3 -m http.server
   ```
3. Open `index.html` in your browser via the web server (not by double-clicking the file). This is required for GPS location and OBS camera selection to work properly.

## Running the Python Backend

The backend server is implemented in Python using Flask and Flask-SocketIO. Follow these steps to install dependencies and run the backend:

### 1. Install Python Dependencies
Navigate to the `webpage` directory and install the required Python packages:

```bash
cd webpage
pip install -r requirements.txt
```

### 2. Start the Backend Server
Run the following command to start the Flask-SocketIO server:

```bash
python app.py
```

By default, the server will run on `0.0.0.0:5050`.

### 3. Connect the Frontend
Ensure your frontend JavaScript connects to the correct backend URL (see Usage section above). When running locally, use:
```javascript
const socket = io('http://127.0.0.1:5050/');
```

When deploying or using the GPU server, update the URL accordingly.

## Notes
- The GPU server uses port 5050.
- If running locally, make sure to update the socket.io URL as shown above.
- Opening the HTML file directly will not enable GPS or camera features; always use a web server.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)

---

*For more information, please contact inbox@harryman.cc.*
