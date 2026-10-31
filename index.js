import 'dotenv/config';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import express from 'express';
import multer from 'multer'; // ১. Multer ইমপোর্ট করুন

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json()); // JSON ডেটা রিড করার জন্য
app.use(express.urlencoded({ extended: true })); // ফর্মের সাধারণ ডেটা রিড করার জন্য

// ২. Multer স্টোরেজ সেটআপ (মেমোরিতে ফাইল সাময়িকভাবে রাখার জন্য)
const upload = multer({ storage: multer.memoryStorage() });

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}


const mongoClient= await connectToMongoDB();

const db = mongoClient.db("studiospace");
const addStudioCollection = db.collection("addstudio")



app.get('/', (req, res) => {
  res.send({ message: 'Server is running fine' });
});

// ৩. এখানে upload.array('images') মিডলওয়্যারটি বসাতে হবে
app.post('/add_studio', upload.array('images'),async (req, res) => {

  const data =req.body

  const result = await addStudioCollection.insertOne(data)

    console.log(result);
    console.log("Text Form Data (req.body):", data); // এখানে আর undefined দেখাবে না, সব টেক্সট ডেটা দেখাবে
    console.log("Uploaded Images (req.files):", req.files); // এখানে ইমেজগুলোর তথ্য দেখাবে

    res.status(200).json( result);
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});