const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

// Home route
app.get('/', (req, res) => {
  res.send("This is the home route");
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads', req.body.quality || 'medium'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// File upload route
app.post('/uploads', upload.single('video'), (req, res) => {
  const filePath = req.file.path.replace(/\\/g, '/'); // Ensure forward slashes
  res.send({ filePath });
});

//
function getFilePath(filename, quality){
  const basePath=path.join(__dirname, 'uploads', quality);
  return path.join(basePath,filename);
}

// Video streaming route
app.get('/stream/:filename', (req, res) => {
  const {filename}=req.params;
  const quality = req.query.quality || 'medium';
  const videoFilePath=getFilePath(filename, quality);
  fs.stat(videoFilePath, (err, stat) => {
    if (err) {
      console.error(err);
      return res.status(404).send('File not found');
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoFilePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": 'bytes',
        "Content-Length": chunksize,
        "Content-Type": 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

// Start the server
app.listen(8080, () => {
  console.log("Server is running at port 8080");
});
