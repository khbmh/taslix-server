const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pzdjl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const db = client.db('taslix');
    const JobsCollection = db.collection('jobs');

    // Save a jobData in the db
    app.post('/add-job', async (req, res) => {
      const jobData = req.body;
      const result = await JobsCollection.insertOne(jobData);
      res.send(result);
    });
    // get all posted jobs
    app.get('/jobs', async (req, res) => {
      const jobs = await JobsCollection.find().toArray();
      res.send(jobs);
    });
    // get a user posted jobs using user email
    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const jobs = await JobsCollection.find(query).toArray();
      res.send(jobs);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from taslix Server....');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
