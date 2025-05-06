import base64
import cv2
import numpy as np
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import torch
from ultralytics import YOLO
import easyocr
import math
from collections import defaultdict

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

# Initialize easyOCR reader with English language
reader = easyocr.Reader(['en'])

# Load YOLOv8 models
model_traffic_signs = YOLO('best2.pt')  # For traffic signs
model_objects = YOLO('yolov8n.pt')      # For cars and buses

# Known object sizes in meters
REAL_PERSON_HEIGHT = 1.7  # Average human height
REAL_CAR_WIDTH = 2.0      # Average car width
REAL_BUS_WIDTH = 2.5      # Average bus width
FOCAL_LENGTH = 700        # Camera focal length in pixels (adjust as needed)

# Function to calculate distance
def calculate_distance(pixel_size, real_size, focal_length=FOCAL_LENGTH):
    if pixel_size > 0:
        distance = (real_size * focal_length) / pixel_size
        return distance
    return None

# Define expected words for traffic signs
expected_words = {
    "NoParking24h": ["24hrs", "24 hrs", "24", "hrs"],
    "NoParkingEnd": ["End"],
    "NoParkingGreen": ["8", "10", "8-10"],
    "NoParkingRed": ["12", "7"],
    "NoParkingYellow": ["7", "7"],
    "ExceptHolidays": ["Except General Holidays"],
    "ExceptTaxi": ["Except taxi"]
}

# Function to match detected text with expected words
def match_detected_to_expected(detected_text, expected_words):
    for key, values in expected_words.items():
        if key == "NoParkingYellow":  # Special case: need to detect two '7's
            count_7 = detected_text.count("7")
            if count_7 >= 2:
                return key  # Return matched class name
        else:
            for expected in values:
                if any(expected in text for text in detected_text):
                    return key  # Return matched class name
    return None  # No match found

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('image')
def handle_image(data_image):
    try:
        # Decode the image from the client
        img_data = base64.b64decode(data_image)
        np_arr = np.frombuffer(img_data, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Initialize variables
        detections = []

        # Process frame with the object detection model (cars and buses)
        results_objects = model_objects(frame)

        for result in results_objects:
            for box in result.boxes:
                label = int(box.cls[0].item())
                confidence = box.conf[0].item()
                bbox = box.xyxy[0].cpu().numpy()

                if len(bbox) == 4:
                    x_min, y_min, x_max, y_max = map(int, bbox)
                    class_name = model_objects.names[label]

                    # Only process cars and buses
                    if class_name.lower() in ['car', 'bus']:
                        pixel_width = x_max - x_min
                        if class_name.lower() == 'car':
                            distance = calculate_distance(pixel_width, REAL_CAR_WIDTH)
                        else:
                            distance = calculate_distance(pixel_width, REAL_BUS_WIDTH)

                        # Draw bounding box and label on the frame
                        color = (0, 255, 255)  # Yellow color for bounding box
                        thickness = 2
                        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, thickness)
                        label_text = f"{class_name} {distance:.2f} m"
                        cv2.putText(frame, label_text, (x_min, y_min - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

                        # Prepare detection result
                        detection = {
                            'xmin': x_min,
                            'ymin': y_min,
                            'xmax': x_max,
                            'ymax': y_max,
                            'confidence': confidence,
                            'class_id': label,
                            'name': class_name,
                            'distance': distance
                        }
                        detections.append(detection)

        # Process frame with the traffic sign detection model
        results_signs = model_traffic_signs(frame)

        for result in results_signs:
            for box in result.boxes:
                label = int(box.cls[0].item())
                confidence = box.conf[0].item()
                bbox = box.xyxy[0].cpu().numpy()

                if len(bbox) == 4:
                    x_min, y_min, x_max, y_max = map(int, bbox)
                    class_name = model_traffic_signs.names[label]

                    # Check if the detected class is one of the expected traffic signs
                    if class_name in expected_words:
                        roi = frame[y_min:y_max, x_min:x_max]

                        # Run OCR on the ROI
                        ocr_result = reader.readtext(roi)
                        detected_text = [text[1] for text in ocr_result]
                        cleaned_text = [text.replace('o', '0') for text in detected_text]
                        matched_class = match_detected_to_expected(cleaned_text, expected_words)

                        if matched_class:
                            print(f"Object updated to: {matched_class} with detected text: {cleaned_text}")
                            class_name = matched_class
                        else:
                            print(f"No match found for detected text: {cleaned_text}")

                    # Draw bounding box and label on the frame
                    color = (0, 255, 0)  # Green color for bounding box
                    thickness = 2
                    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, thickness)
                    cv2.putText(frame, f"{class_name} {confidence:.2f}", (x_min, y_min - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

                    # Prepare detection result
                    detection = {
                        'xmin': x_min,
                        'ymin': y_min,
                        'xmax': x_max,
                        'ymax': y_max,
                        'confidence': confidence,
                        'class_id': label,
                        'name': class_name
                    }
                    detections.append(detection)

        # Encode the frame back to JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        # Send the detection results and annotated image back to the client
        emit('detections', {'detections': detections, 'image': jpg_as_text})
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5050)