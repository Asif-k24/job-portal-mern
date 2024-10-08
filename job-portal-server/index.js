require('dotenv').config();
require("./Models/db");
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');
const port = process.env.PORT;
const AuthRouter = require("./Routes/AuthRouter");
const ensureAuthenticated = require('./Middlewares/Auth');
// const ensureAuthenticated = require('./Middlewares/Auth');

// middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use('/auth', AuthRouter);
// app.use('/', AuthRouter);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGO_CONN;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // create db
        const db = client.db("mernJobPortal");
        const jobsCollections = db.collection("jobs")

        // post a job
        app.post("/post-job", ensureAuthenticated, async (req, res) => {
            console.log('---- logged in user detail ----', req.user);
            const body = req.body;
            body.createdAt = new Date();
            // console.log(body)
            const result = await jobsCollections.insertOne(body);
            if (result.insertedId) {
                return res.status(200).send(result);
            } else {
                return res.status(404).send({
                    message: "cannot insert try again later",
                    status: false
                })
            }
        })

        // get all jobs
        app.get("/all-jobs", async (req, res) => {
            const jobs = await jobsCollections.find().toArray();
            res.send(jobs);
        })

        // get single job using id
        app.get("/all-jobs/:id", async (req, res) => {
            const id = req.params.id;
            const job = await jobsCollections.findOne({
                _id: new ObjectId(id)
            })
            res.send(job);
        })

        // get jobs by email
        app.get("/myJobs/:email", async (req, res) => {
            // console.log(req.params.email);
            const jobs = await jobsCollections.find({ postedBy: req.params.email }).toArray();
            res.send(jobs);
        })

        // delete a job
        app.delete("/job/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await jobsCollections.deleteOne(filter);
            res.send(result);
        })

        // update a jobs
        app.patch("/update-job/:id", async (req, res) => {
            const id = req.params.id;
            const jobData = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...jobData
                },
            };
            const result = await jobsCollections.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You are successfully connected to MongoDB!");
    } finally {
        process.on('SIGINT', async () => {
            await client.close();
            console.log('MongoDB disconnected on app termination');
            process.exit(0);
        });
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Developer!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port} `)
})