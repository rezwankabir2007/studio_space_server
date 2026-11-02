import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { createRemoteJWKSet, jwtVerify } from 'jose'; // <-- এখানে jwtVerify যোগ করা হয়েছে

const app = express();
const PORT = 8000;

app.use(cors());
// JSON ডেটার লিমিট বাড়িয়ে দেওয়া যাতে বড় Base64 ইমেজ সহজে নিতে পারে
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ব্যাকএন্ড সিকিউরিটি মিডলওয়্যার (সংশোধিত ও নিরাপদ)
const verifyApi = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));

    const { payload } = await jwtVerify(token, JWKS);

    console.log("Token payload:", payload);
    
    // চাইলে পরবর্তী রাউটে ব্যবহার করার জন্য রিকোয়েস্টে পেলেলোড যুক্ত করে দিতে পারেন
    req.user = payload; 

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// স্ট্যাটিক ফোল্ডার (যদি অন্য কোনো ফাইলের জন্য লাগে)
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

// Add Studio API (ফ্রন্টএন্ড থেকে পাঠানো JSON এবং Base64 ইমেজ রিসিভ করবে)
app.post('/add_studio', verifyApi, async (req, res) => {
  try {
    const data = req.body;
    
    // ডাটা সরাসরি MongoDB তে সেভ করা হচ্ছে
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

// প্রোফাইল পেজের জন্য ইমেইল দিয়ে স্টুডিও ফেচ করার রাউট
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

// Single Studio Details API
app.get('/exploreStudios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Studio ID"
      });
    }

    const result = await addStudioCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!result) {
      return res.status(404).json({
        message: "Studio not found"
      });
    }

    res.status(200).json(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch studio"
    });
  }
});

// Edit api
app.patch('/exploreStudios/:id', verifyApi, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const result = await addStudioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );
  res.json(result);
});

// Delete Api
app.delete('/exploreStudios/:id', verifyApi, async (req, res) => {
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

app.get("/my-bookings/:email", verifyApi, async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection
    .find({ userEmail: email })
    .toArray();
  res.send(result);
});

app.delete("/booking/:id", verifyApi, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid booking ID" });
    }

    const result = await bookingCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Booking not found" });
    }

    res.send({ message: "Booking deleted successfully", result });
  } catch (error) {
    res.status(500).send({ message: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});