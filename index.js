const express = require("express");
const app = express();
const cors = require("cors");
const port = 8000;
require("dotenv").config();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("Novara");
    const writersCollection = db.collection("writers");
    const userCollection = db.collection("user");
    const bookMarkedCollection = db.collection("bookMarked");
    const paymentCollection = db.collection("payment");
    // console.log('usercollection',userCollection);

    // user related routes
    app.get("/api/user", async (req, res) => {
      try {
        const user = await userCollection.find({}).toArray();
        res.send(user);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/api/user/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const filter = {
          _id: new ObjectId(userId),
        };
        const { role } = req.body;
        const updated = {
          $set: {
            role: role,
          },
        };
        const result = await userCollection.updateOne(filter, updated);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.delete("/api/user/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const filter = {
          _id: new ObjectId(userId),
        };
        const result = await userCollection.deleteOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // writers  releted routes
    app.get("/api/writers", async (req, res) => {
      try {
        const query = {
          status: "published",
        };
        const result = await writersCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/api/writers/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const query = { id: userId };

        const result = await writersCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // browse books (bookdetails)
    app.get("/api/writers/books/:id", async (req, res) => {
      try {
        const bookId = req.params.id;
        // console.log(bookId, "from browse books");
        const query = { _id: new ObjectId(bookId) };
        const result = await writersCollection.findOne(query);
        // console.log(result, "from browse booksdetails");
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.post("/api/writers", async (req, res) => {
      try {
        const book = req.body;
        // console.log(book, "from backend");

        const result = await writersCollection.insertOne(book);

        res.send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.delete("/api/writers/:id", async (req, res) => {
      try {
        const bookId = req.params.id;
        const filter = { _id: new ObjectId(bookId) };

        const result = await writersCollection.deleteOne(filter);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // delete a book in admin manage books apge
    app.delete("/api/writers/delete/:id", async (req, res) => {
      try {
        const bookId = req.params.id;
        const filter = { _id: new ObjectId(bookId) };
        const result = await writersCollection.deleteOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/api/writers/:id", async (req, res) => {
      try {
        const bookId = req.params.id;
        const filter = { _id: new ObjectId(bookId) };

        const update = {
          $set: req.body,
        };

        const result = await writersCollection.updateOne(filter, update);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/api/writers/:id", async (req, res) => {
      try {
        const { status } = req.body;
        const bookId = req.params.id;
        const filter = { id: new ObjectId(bookId) };
        const update = {
          $set: {
            status: status,
          },
        };

        const result = await writersCollection.updateOne(filter, update);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //status update in admin manage books apge
    app.patch("/api/writers/status/:id", async (req, res) => {
      try {
        const bookId = req.params.id;
        const filter = { _id: new ObjectId(bookId) };
        const { status } = req.body;
        const update = {
          $set: {
            status: status,
          },
        };

        const result = await writersCollection.updateOne(filter, update);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // book marked routes (  add bookmark)
    app.post("/api/bookmark", async (req, res) => {
      try {
        const data = req.body;

        const alreadyBookmarked = await bookMarkedCollection.findOne({
          userId: new ObjectId(data.userId),
          bookId: new ObjectId(data.bookId),
        });

        if (alreadyBookmarked) {
          return res.status(400).send({
            success: false,
            message: "Bookmark already exists",
          });
        }
        data.userId = new ObjectId(data.userId);
        data.bookId = new ObjectId(data.bookId);

        const result = await bookMarkedCollection.insertOne(data);

        return res.json(result);
      } catch (error) {
        return res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // deleted bookmark
    app.delete("/api/bookmark", async (req, res) => {
      const { userId, bookId } = req.body;

      const result = await bookMarkedCollection.deleteOne({
        userId,
        bookId,
      });

      res.json(result);
    });

    // writers bookmark page api call for get all bookmarks by user
  app.get("/api/bookmark", async (req, res) => {
    try {
      const { writerId } = req.query;
      console.log(writerId, "from bookmark!!!");

      const result = await bookMarkedCollection
        .aggregate([
          {
            $match: {
              writerId: writerId,
            },
          },

          // {
          //   $addFields: {
          //     convertedBookId: { $toObjectId: "$bookId" },
          //   },
          // },

          {
            $lookup: {
              from: "writers", // your books collection name

              localField: 'bookId', // the field in your books collection

              foreignField: "_id",

              as: "book",
            },
          },

          {
            $unwind: "$book",
          },
        ])
        .toArray();
        console.log(result, "from bookmark!!!");

      res.send(result);
    } catch (error) {
      res.status(500).send({
        message: error.message,
      });
    }
  });

    // check bookmark from browse books page
    app.get("/api/bookmark-check", async (req, res) => {
      try {
        const { userId, bookId } = req.query;
        // console.log(userId, bookId, "from check bookmark");

        if (!userId || !bookId) {
          return res.status(400).send({
            success: false,
            message: "userId and bookId are required",
          });
        }

        const result = await bookMarkedCollection.findOne({
          bookId,
          userId, // STRING MATCH
        });
        // console.log(result);

        return res.status(200).send({
          isBookmarked: !!result,
        });
      } catch (error) {
        return res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // reader bookmark page api call for get all books by user
    app.get("/api/bookmarks/my/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        // console.log(userId, "from bookmarks!!!!");

        const result = await bookMarkedCollection
          .aggregate([
            {
              $match: {
                userId: userId,
              },
            },
            // 1. Convert the string bookId to an ObjectId
            {
              $addFields: {
                convertedBookId: { $toObjectId: "$bookId" },
              },
            },
            // 2. Use the newly converted field for the lookup
            {
              $lookup: {
                from: "writers",
                localField: "convertedBookId",
                foreignField: "_id",
                as: "book",
              },
            },
            {
              $unwind: "$book",
            },
          ])
          .toArray();

        // console.log(result, "from bookmarks!!!!");
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // payments related routes ( add payment)
    app.post("/api/payments", async (req, res) => {
      const { sessionId, name, userId, userEmail, priceId, bookId, writerId } =
        req.body;

      const alreadyExists = await paymentCollection.findOne({ sessionId });
      if (alreadyExists) {
        return res.status(400).send({
          success: false,
          message: "Payment already exists",
        });
      }
      const result = await paymentCollection.insertOne({
        sessionId,
        userId,
        userEmail,
        priceId,
        name,
        bookId,
        writerId,
        purchaseDate: new Date(),
      });
      res.send({ message: "payment added successfully", success: true });
    });

    // writers sales page api call for get all books by writer
    app.get("/api/sales-history", async (req, res) => {
      try {
        const { writerId } = req.query;
        // console.log(writerId, "from sales history");
        const query = { writerId };
        const result = await paymentCollection.find(query).toArray();
        // console.log(result, "from sales history");
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
