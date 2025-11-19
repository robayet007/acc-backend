const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-notes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Models
const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authorName: { type: String, required: true },
  paper: { type: String, required: true },
  chapterId: { type: Number, required: true },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const Note = mongoose.model('Note', NoteSchema);

// API Routes

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    
    // Add full URL to images
    const notesWithFullUrls = notes.map(note => ({
      ...note._doc,
      images: note.images.map(img => {
        if (img.startsWith('http')) {
          return img;
        }
        return `${req.protocol}://${req.get('host')}${img}`;
      })
    }));
    
    res.json(notesWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new note - UPDATED WITH MULTER
app.post('/api/notes', upload.array('images', 10), async (req, res) => {
  try {
    const { title, authorName, paper, chapterId } = req.body;
    
    console.log('Received files:', req.files);
    console.log('Received body:', req.body);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }
    
    // Get uploaded file paths
    const images = req.files.map(file => `/uploads/${file.filename}`);
    
    const newNote = new Note({
      title,
      authorName,
      paper,
      chapterId: parseInt(chapterId),
      images,
      createdAt: new Date()
    });

    const savedNote = await newNote.save();
    
    // Add full URLs to response
    const responseNote = {
      ...savedNote._doc,
      images: savedNote.images.map(img => `${req.protocol}://${req.get('host')}${img}`)
    };
    
    res.status(201).json(responseNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(400).json({ message: error.message });
  }
});

// Other routes remain the same...
app.get('/api/notes/:paper/:chapterId', async (req, res) => {
  try {
    const { paper, chapterId } = req.params;
    const notes = await Note.find({ 
      paper, 
      chapterId: parseInt(chapterId) 
    }).sort({ createdAt: -1 });
    
    const notesWithFullUrls = notes.map(note => ({
      ...note._doc,
      images: note.images.map(img => {
        if (img.startsWith('http')) {
          return img;
        }
        return `${req.protocol}://${req.get('host')}${img}`;
      })
    }));
    
    res.json(notesWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findById(id);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    // Delete associated image files
    note.images.forEach(imagePath => {
      const filename = path.basename(imagePath);
      const filePath = path.join(__dirname, 'uploads', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    await Note.findByIdAndDelete(id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get chapters route...
app.get('/api/chapters/:paper', (req, res) => {
  const { paper } = req.params;
  
  const accounting1Chapters = [
    { id: 1, title: "হিসাববিজ্ঞান পরিচিতি", paper: "1st Paper" },
    { id: 2, title: "হিসাব বইসমূহ", paper: "1st Paper" },
    { id: 3, title: "ব্যাংক সমন্বয় বিবরণী", paper: "1st Paper" },
    { id: 4, title: "রেওয়ামিল", paper: "1st Paper" },
    { id: 5, title: "হিসাবের নীতিমালা", paper: "1st Paper" },
    { id: 6, title: "প্রাপ্য হিসাবসমূহের হিসাবরক্ষণ", paper: "1st Paper" },
    { id: 7, title: "কার্যপত্র", paper: "1st Paper" },
    { id: 8, title: "দৃশ্যমান ও অদৃশ্যমান সম্পদের হিসাবরক্ষণ", paper: "1st Paper" },
    { id: 9, title: "আর্থিক বিবরণী", paper: "1st Paper" },
    { id: 10, title: "একতরফা দাখিলা পদ্ধতি", paper: "1st Paper" }
  ];

  const accounting2Chapters = [
    { id: 1, title: "অংশীদারি ব্যবসায়ের হিসাব", paper: "2nd Paper" },
    { id: 2, title: "কোম্পানি হিসাব", paper: "2nd Paper" },
    { id: 3, title: "ব্যয় হিসাববিজ্ঞান", paper: "2nd Paper" },
    { id: 4, title: "বাজেট ও বাজেট নিয়ন্ত্রণ", paper: "2nd Paper" },
    { id: 5, title: "আর্থিক বিবরণী বিশ্লেষণ", paper: "2nd Paper" },
    { id: 6, title: "অলাভজনক প্রতিষ্ঠানের হিসাব", paper: "2nd Paper" },
    { id: 7, title: "শাখা হিসাব", paper: "2nd Paper" },
    { id: 8, title: "বিভাগীয় হিসাব", paper: "2nd Paper" },
    { id: 9, title: "কম্পিউটারাইজড হিসাববিজ্ঞান", paper: "2nd Paper" }
  ];

  const chapters = paper === '1st Paper' ? accounting1Chapters : accounting2Chapters;
  res.json(chapters);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});