import 'dotenv/config'
import { MongoClient } from 'mongodb';
import express  from 'express';

const app = express()
const PORT =8000


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


connectToMongoDB()


app.get('/', (req, res) => {
  res.send({message:'Server is running fine'})
})


// http://localhost:8000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})