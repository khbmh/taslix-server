const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const jobsCollection = db.collection('jobs');
    const bidsCollection = db.collection('bids');

    // Save a jobData in the db
    app.post('/add-job', async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });
    // get all posted jobs
    app.get('/jobs', async (req, res) => {
      const jobs = await jobsCollection.find().toArray();
      res.send(jobs);
    });
    // get single job by id
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      res.send(job);
    });

    // get a user posted jobs using user email
    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const jobs = await jobsCollection.find(query).toArray();
      res.send(jobs);
    });
    // Update a jobData in the db
    app.put('/update-job/:id', async (req, res) => {
      const jobData = req.body;
      const id = req.params.id;
      const updated = {
        $set: jobData,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await jobsCollection.updateOne(query, updated, options);
      res.send(result);
    });
    // delete a job by its id
    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });
    /*
          bids
    */
    // Save a bidData in the db
    app.post('/add-bid', async (req, res) => {
      const bidData = req.body;
      // 0. user already placed a bid
      const query = { email: bidData.email, jobId: bidData.jobId };
      const alreadyExists = await bidsCollection.findOne(query);
      if (alreadyExists) {
        return res.status(409).send('You have already placed a bid.');
      }

      // 1. save in bid data
      const result = await bidsCollection.insertOne(bidData);

      // 2. update bid count in job data
      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = {
        $inc: { bid_count: 1 },
      };
      const updateBidCount = await jobsCollection.updateOne(filter, update);

      res.send(result);
    });

    // get all bids
    app.get('/bids', async (req, res) => {
      const bids = await bidsCollection.find().toArray();
      res.send(bids);
    });

    // get a user posted jobs using user email
    app.get('/bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const bids = await bidsCollection.find(query).toArray();
      res.send(bids);
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
