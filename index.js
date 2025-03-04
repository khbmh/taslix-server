const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 9000;
const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://taslix.netlify.app/',
    'https://taslix.web.app/',
  ],
  credentials: true,
  optionsSuccessStatus: 200, // some browsers choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pzdjl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) return res.status(401).send({ message: 'unauthorized access' });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'invalid token' });
    req.user = decoded;
    // next();
  });
  next();
};

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const db = client.db('taslix');
    const jobsCollection = db.collection('jobs');
    const bidsCollection = db.collection('bids');

    // generate json web token (jwt)
    /*
    const jwt = require('jsonwebtoken');
    const SECRET_KEY = process.env.JWT_SECRET;

    const generateToken = (id) => {
      return jwt.sign({ id }, SECRET_KEY, { expiresIn: '1h' });
    };
*/
    // generate token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      // create a token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '50d',
      });
      // console.log(token);
      // res.send(token); // uncommenting this line took longer
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });
    // clear cookies from browser
    app.get('/logout', (req, res) => {
      res.clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });
      res.send({ success: true });
    });
    // ai helped below code
    /*
app.post('/jwt', async (req, res) => {
  try {
    const email = req.body;

    // Create a token
    const token = jwt.sign(email, process.env.SECRET_KEY, {
      expiresIn: '50d',
    });

    // Set the token as a cookie and send the response
    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true, token });
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});
    */

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

    // get all jobs with filters
    app.get('/all-jobs', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      // console.log(search);
      let options = {};

      if (sort)
        options = {
          sort: { deadline: sort === 'asc' ? 1 : sort === 'dsc' ? '-1' : 0 },
        };
      let query = {
        title: { $regex: search, $options: 'i' },
      };

      if (filter) {
        query.category = filter;
      }

      const jobs = await jobsCollection.find(query, options).toArray();
      res.send(jobs);
    });

    // get single job by id
    app.get('/job/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      res.send(job);
    });

    // get a user posted jobs using user email
    app.get('/jobs/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.params.email;
      // console.log('decoded', decodedEmail);
      // console.log('params', email);

      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' });
      const query = { 'buyer.email': email };
      const jobs = await jobsCollection.find(query).toArray();
      res.send(jobs);
    });
    // Update a jobData in the db
    app.put('/update-job/:id', verifyToken, async (req, res) => {
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
    app.delete('/job/:id', verifyToken, async (req, res) => {
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

    // update a bid
    app.patch('/bid-status-update/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      // return console.log(status);
      const filter = { _id: new ObjectId(id) };
      const updated = {
        $set: { status },
      };
      const result = await bidsCollection.updateOne(filter, updated);
      res.send(result);
    });

    // get all bids
    app.get('/bids', async (req, res) => {
      const bids = await bidsCollection.find().toArray();
      res.send(bids);
    });

    // get a user posted bids using user email
    app.get('/bids/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const isBuyer = req.query.buyer;
      const email = req.params.email;
      // console.log('decoded', decodedEmail);
      // console.log('params', email);

      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' });

      // when value is must need and value is dynamic then we have to use params
      // console.log(isBuyer);
      let query = {};
      // when value is not dynamic and not a must have then we should use query
      if (isBuyer) {
        query.buyerEmail = email; // { email: email } key == value
      } else {
        query.email = email;
      }
      // const query = { email }; // { email: email } key == value
      const bids = await bidsCollection.find(query).toArray();
      res.send(bids);
    });
    // get a user posted bids using buyer email
    // app.get('/bid-requests/:email', async (req, res) => {
    //   const buyerEmail = req.params.email;
    //   const query = { buyerEmail  }; // { email: email } key == value
    //   const bids = await bidsCollection.find(query).toArray();
    //   res.send(bids);
    // });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!',
    // );
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from taslix Server....');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
