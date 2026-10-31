import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();
const PORT = 8000;

app.use(cors());
// JSON এবং URL-encoded ডেটার লিমিট বাড়িয়ে দিন যাতে বড় টেক্সট বা ডেটা নিতে পারে
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

// uploads ফোল্ডারটিকে পাবলিকলি স্ট্যাटिक করে দেওয়া
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
        url: `/uploads/${file.filename}` // লোকাল পাথ সেভ হবে
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


// single details page api

app.get('/exploreStudios/:id',async(req,res)=>{
  const {id} = req.params
  const result =await addStudioCollection.findOne({_id : new ObjectId(id)})

  res.send(result)
})

// Edit api
app.patch('/exploreStudios/:id',async(req,res)=>{

  const {id} = req.params
  const updateData = req.body
  const result =await addStudioCollection.updateOne(
    {_id:new ObjectId(id)},
    {$set:updateData}
  )
res.json(result)
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});