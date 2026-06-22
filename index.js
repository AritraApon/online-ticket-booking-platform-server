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
    const usersCollection = database.collection('user');
    const transactionsCollection = database.collection('transactions');

    // --------------------------------------------------------------------------------------TICKET ROUTES ---------------------------------------------------------------------------------------------------------------

    // ----------------------GET Approved ALL TICKETS----------------------
 // ----------------------GET Approved ALL TICKETS (with search, filter, sort, pagination)----------------------
app.get('/api/tickets/all', async (req, res) => {
  try {
    const { from, to, transport, sort, page = 1, limit = 6 } = req.query;

    const query = {
      verificationStatus: 'approved',
      isHidden: { $ne: true }
    };

    if (from) query.from = { $regex: from, $options: 'i' };
    if (to) query.to = { $regex: to, $options: 'i' };
    if (transport && transport !== 'all') query.transportType = transport;

    let sortOption = { _id: -1 }; // default
    if (sort === 'lowToHigh') sortOption = { pricePerUnit: 1 };
    if (sort === 'highToLow') sortOption = { pricePerUnit: -1 };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await ticketsCollection.countDocuments(query);
    const result = await ticketsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.send({
      tickets: result,
      totalCount: total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
});;

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


// ------(home Page)------------Admin GET Approved Advertise Tickets ----------------------
    app.get('/api/tickets/admin/advertise', async (req, res) => {
      const result = await ticketsCollection.find({ isAdvertised: true, isHidden: false }).toArray();
      res.send(result);
    })


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
      try {
        const id = req.params.id;

        const result = await ticketsCollection.deleteOne({ _id: new ObjectId(id) });

        await bookingsCollection.updateMany(
          { ticketId: id },
          { $set: { ticketDeleted: true } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });
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

    // ----------------------Update Admin Status------------------------
  app.patch('/api/tickets/advertise/:id', async (req, res) => {
  try {
    const { isAdvertised } = req.body;
    const result = await ticketsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isAdvertised: isAdvertised } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error });
  }
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
        const query = { userId: userId };

        const cursor = bookingsCollection.find(query);
        const result = await cursor.toArray();

        result.sort((a, b) => {
          const statusA = (a.status === 'accepted') ? 1 : 0;
          const statusB = (b.status === 'accepted') ? 1 : 0;
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
          const statusA = (a.status === 'pending') ? 1 : 0;
          const statusB = (b.status === 'pending') ? 1 : 0;
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


    // ----------------------GET ALL USERS--(Admin)--------------------
    app.get('/api/users/admin/all', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })


    // ----------------------UPDATE USER ROLE-(Admin)---------------------
    app.patch('/api/users/role/:id', async (req, res) => {
      try {
        const { role } = req.body;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { role } }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Server error or invalid ID' });
      }
    });
    //------------------------UPDATE USER isFRAUD-(Admin)---------------------
    app.patch('/api/users/fraud/:id', async (req, res) => {
      try {
        const { isFraud } = req.body;
        const userId = req.params.id;

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { isFraud: isFraud } }
        );

        const vendor = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (vendor) {
          const targetVendorIdStr = vendor._id.toString();

          await ticketsCollection.updateMany(
            { vendorId: targetVendorIdStr },
            { $set: { isHidden: isFraud } }
          );


          await bookingsCollection.updateMany(
            { vendorId: targetVendorIdStr },
            { $set: { isFraud: isFraud } }
          );
        }

        res.send({ success: true, message: isFraud ? 'Marked as fraud successfully' : 'Fraud status cleared successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Server error' });
      }
    });

    // ------------------------------------------------------------------------------------------------------PAYMENT ROUTES ---------------------------------------------------------------------------------------------------------------

    app.patch('/api/booking/payment-success/:id', async (req, res) => {
      try {
        const bookingId = req.params.id;
        const { transactionId, amount } = req.body;  // client থেকে এই দুইটাই আসবে

        const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
        if (!booking) {
          return res.status(404).send({ error: true, message: 'Booking not found' });
        }

        if (booking.status === 'paid') {
          return res.send({ success: true, message: 'Already processed' });
        }

        await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { status: 'paid' } }
        );

        await ticketsCollection.updateOne(
          { _id: new ObjectId(booking.ticketId) },
          { $inc: { quantity: -booking.bookingQuantity } }
        );


        const transaction = {
          transactionId,
          bookingId,
          userId: booking.userId,
          userEmail: booking.userEmail,
          ticketTitle: booking.ticketTitle,
          amount,
          paymentDate: new Date()
        };
        await transactionsCollection.insertOne(transaction);

        res.send({ success: true, message: 'Payment confirmed and updated' });
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    // ----------------------Get User's Transaction History----------------------
    app.get('/api/transactions/user/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;
        const result = await transactionsCollection
          .find({ userId: userId })
          .sort({ paymentDate: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    // ----------------------Vendor Revenue Overview----------------------

    app.get('/api/revenue/vendor/:vendorId', async (req, res) => {
      try {
        const vendorId = req.params.vendorId;


        const totalTicketsAdded = await ticketsCollection.countDocuments({ vendorId });


        const paidBookings = await bookingsCollection.find({ vendorId, status: 'paid' }).toArray();

        const totalTicketsSold = paidBookings.reduce((sum, b) => sum + b.bookingQuantity, 0);
        const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);

        res.send({
          totalTicketsAdded,
          totalTicketsSold,
          totalRevenue,
          paidBookings
        });
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });


    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

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