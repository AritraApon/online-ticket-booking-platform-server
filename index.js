const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
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
    const bookingsCollection = database.collection('bookings');

    // --------------------------------------------------------------------------------------TICKET ROUTES ---------------------------------------------------------------------------------------------------------------

    // ----------------------GET Approved ALL TICKETS----------------------
    app.get('/api/tickets/all', async (req, res) => {
      try {
        const query = {
          verificationStatus: 'approved',
          isHidden: { $ne: true }
        };

        const cursor = ticketsCollection.find(query).sort({ _id: -1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: true, message: err.message });
      }
    });

    app.get('/api/tickets/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await ticketsCollection.findOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: true, message: err.message });
      }
    });

    // ----------------------POST-TICKET-(VENDOR ONLY)----------------------
    app.post('/api/tickets', async (req, res) => {
      const newTicket = req.body;
      const result = await ticketsCollection.insertOne(newTicket);
      res.send(result);
    });

    // ----------------------GET VENDOR ADDED TICKETS--------------------------
    app.get('/api/tickets/vendor/:userId', async (req, res) => {
      const userId = req.params.userId;
      const cursor = ticketsCollection.find({ vendorId: userId }).sort({ _id: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })



    // ----------------------DELETE VENDOR ADDED TICKETS--------------------------
    app.delete('/api/tickets/vendor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ticketsCollection.deleteOne(query);
      res.send(result);
    })

    // ----------------------Update VENDOR ADDED TICKETS------------------------
    app.patch('/api/tickets/vendor/:id', async (req, res) => {
      const result = await ticketsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    })

    // ----------------------Get Admin all Tickets------------------------

    app.get('/api/tickets/admin/all', async (req, res) => {
      const result = await ticketsCollection
        .find()
        .sort({ verificationStatus: 1, createdAt: -1 }) // pending আগে দেখাবে
        .toArray();
      res.send(result);
    })

    // ----------------------Update Admin Status------------------------
    app.patch('/api/tickets/status/:id', async (req, res) => {
      const { verificationStatus } = req.body;
      const result = await ticketsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { verificationStatus } }
      );
      res.send(result);
    });




    // ------------------------------------------------------------------------------------------------------BOOKING ROUTES ---------------------------------------------------------------------------------------------------------------


    // ----------------------POST-Booking-TICKET-(USER)----------------------

    app.post('/api/booking', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    })


    // ----------------------Get-Booking-TICKET-(USER)----------------------
    app.get('/api/booking/user/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;

        const cursor = bookingsCollection.find({ userId: userId });
        const result = await cursor.toArray();

        result.sort((a, b) => {
          const statusA = (a.status === 'accepted' ) ? 1 : 0;
          const statusB = (b.status === 'accepted' ) ? 1 : 0;
          return statusB - statusA;
        });

        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    // ----------------------Get-Booking-TICKET-(VENDOR)----------------------

app.get('/api/booking/vendor/:vendorId', async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const cursor = bookingsCollection.find({ vendorId: vendorId });
    const result = await cursor.toArray();
    result.sort((a, b) => {
          const statusA = (a.status === 'pending' ) ? 1 : 0;
          const statusB = (b.status === 'pending' ) ? 1 : 0;
          return statusB - statusA;
        });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

    // ----------------------Update-Status-Booking-TICKET-(VENDOR)--------------
    app.patch('/api/booking/status/:id', async (req, res) => {
      const { status } = req.body;
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status } }
      );
      res.send(result);
    })





    // ------------------------------------------------------------------------------------------------------users ROUTES ---------------------------------------------------------------------------------------------------------------






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