If the want to run the program, you should edit the javascript file URL in iine 6
const socket = io('https://d.harryman.cc/'); // Automatically connects to the server that served the page

This is the gpu server ip address the port is using 5050

if you run in local please use:
const socket = io('http://127.0.0.1:5050/');

You should use the web server to open the index.html, else it can not show the GPS location and choose the OBS camera.