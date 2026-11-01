import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();
const PORT = 8000;

app.use(cors());
// JSON এবং URL-encoded ডেটার লিমিট বাড়িয়ে দেওয়া যাতে বড় টেক্সট বা ডেটা নিতে পারে
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ফিজিক্যাল ফোল্ডারে ফাইল সেভ করার জন্য diskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // প্রজেক্ট রুটে 'uploads' ফোল্ডার থাকতে হবে
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// uploads ফোল্ডারটিকে পাবলিকলি স্ট্যাটিক করে দেওয়া
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");
const addStudioCollection = db.collection("addstudio");
const bookingCollection = db.collection("booking");

app.get('/', (req, res) => {
  res.send({ message: 'Server is running fine' });
});

// /add_studio রাউট (FormData এবং Multer দিয়ে হ্যান্ডেল করা)
app.post('/add_studio', upload.array('image', 10), async (req, res) => {
  try {
    const data = req.body;
    
    if (req.files && req.files.length > 0) {
      data.images = req.files.map(file => ({
        filename: file.filename,
        url: `http://localhost:${PORT}/uploads/${file.filename}` // Full URL যাতে frontend-e image load a problem na hoy
      }));
    }

    const result = await addStudioCollection.insertOne(data);
    res.status(200).json({ success: true, result, message: "Studio added successfully!" });
  } catch (error) {
    console.error("Error saving studio:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/exploreStudios', async (req, res) => {
  const result = await addStudioCollection.find().toArray();
  res.send(result);
});

// প্রোফাইল পেজের জন্য ইমেইল দিয়ে স্টুডিও ফেচ করার রাউট
app.get('/studios', async (req, res) => {
  try {
    const { email } = req.query;
    let query = {};
    if (email) {
      query = { hostEmail: email };
    }
    const result = await addStudioCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// single details page api
app.get('/exploreStudios/:id', async (req, res) => {
  const { id } = req.params;
  const result = await addStudioCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

// Edit api
app.patch('/exploreStudios/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const result = await addStudioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );
  res.json(result);
});

// Delete Api
app.delete('/exploreStudios/:id', async (req, res) => {
  const { id } = req.params;
  const result = await addStudioCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

// Booking api
app.post('/booking', async (req, res) => {
  try {
    const bookingData = req.body;
    const result = await bookingCollection.insertOne(bookingData);
    res.status(200).json({ success: true, result, message: "Booking created successfully!" });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection
    .find({ userEmail: email })
    .toArray();
  res.send(result);
});

app.delete("/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID",
      });
    }

    const result = await bookingCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Booking not found",
      });
    }

    res.send({
      message: "Booking deleted successfully",
      result,
    });

  } catch (error) {
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});