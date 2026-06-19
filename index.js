const express = require('express');
const cors = require('cors');
const app = express()
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_DB_URI;

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

    // ---------------------------------------------------------------------
    // ----------------Database  Collection --------------------------------
    // ---------------------------------------------------------------------
    const database = client.db('online-ticket-booking-platform');
    const ticketsCollection = database.collection('tickets');


    // --------------------------------------------------------------------------------------TICKET ROUTES ---------------------------------------------------------------------------------------------------------------

    app.get('/api/tickets', async (req, res) => {
      const cursor = ticketsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ----------------------TICKET-POST-----------------------
    app.post('/api/tickets', async (req, res) => {
      const newTicket = req.body;
      const result = await ticketsCollection.insertOne(newTicket);
      res.send(result);
    });


    // --------------------------------------------------------------------------------------BOOKING ROUTES ---------------------------------------------------------------------------------------------------------------


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}


run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})