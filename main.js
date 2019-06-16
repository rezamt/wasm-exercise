const SCALED_WIDTH = 240;
const inputVideo = document.querySelector('#inputVideo');
const outputCanvas = document.querySelector('#outputCanvas');
let src;
let dst;
let cap;
let stats;
let gray;
let grayScaled;
let faces;
let classifier;
let ratio;
let scaleRatio;

cv.onRuntimeInitialized = startStreaming;

function startStreaming() {
  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then(stream => {
      setupStats();
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      const width = settings.width;
      const height = settings.height;
      ratio = height / width;
      scaleRatio = width / SCALED_WIDTH;
      let videoWidthPx = `${width}px`;
      let videoHeightPx = `${height}px`;
      inputVideo.setAttribute('width', videoWidthPx);
      inputVideo.setAttribute('height', videoHeightPx);
      outputCanvas.setAttribute('width', videoWidthPx);
      outputCanvas.setAttribute('height', videoHeightPx);
      inputVideo.srcObject = stream;
      inputVideo.play();

      src = new cv.Mat(height, width, cv.CV_8UC4);
      dst = new cv.Mat(height, width, cv.CV_8UC4);
      cap = new cv.VideoCapture(inputVideo);
      gray = new cv.Mat();
      grayScaled = new cv.Mat();
      faces = new cv.RectVector();

      return loadFaceDetectionClassifier();
    })
    .then(() => window.requestAnimationFrame(processVideo))
    .catch(console.error);
}

function processVideo() {
  stats.begin();
  cap.read(src);

  src.copyTo(dst);
  cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY);
  cv.resize(gray, grayScaled, {width: SCALED_WIDTH, height: SCALED_WIDTH * ratio});
  classifier.detectMultiScale(grayScaled, faces, 1.1, 3, 0);

  for (let i = 0; i < faces.size(); i++) {
    let face = faces.get(i);
    let topLeft = new cv.Point(face.x * scaleRatio, face.y * scaleRatio);
    let bottomRight = new cv.Point(face.x * scaleRatio + face.width * scaleRatio, face.y * scaleRatio + face.height * scaleRatio);
    cv.rectangle(dst, topLeft, bottomRight, [255, 0, 0, 255]);
  }

  cv.imshow(outputCanvas, dst);
  stats.end();

  window.requestAnimationFrame(processVideo);
}

/**
 * Load face detection classifier
 */
const classifierName = 'haarcascade_frontalface_default.xml';
const classifierBuffer = fetch(`./face-detection/${classifierName}`)
  .then(response => response.arrayBuffer());

function loadFaceDetectionClassifier() {
  return classifierBuffer
    .then(buffer => {
      cv.FS_createDataFile('/', classifierName, new Uint8Array(buffer), true, false, false);
      classifier = new cv.CascadeClassifier();
      classifier.load(classifierName);
    })
}

/**
 * Setup FPS meter
 */
function setupStats() {
  stats = new Stats();
  stats.showPanel(0);
  stats.domElement.style.right = '0px';
  stats.domElement.style.left = '';
  document.body.appendChild(stats.domElement);
}
