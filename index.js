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
        const result = await writersCollection.find({}).toArray();
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
        console.log(book, "from backend");

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
      const data = req.body;

      const result = await bookMarkedCollection.insertOne(data);

      res.json(result);
    });

    // deleted bookmark
    app.delete("/api/bookmark", async (req, res) => {
      const { bookmarkUserEmail, book } = req.body;

      const result = await bookMarkedCollection.deleteOne({
        bookmarkUserEmail,

        "book._id": book._id,
      });

      res.json(result);
    });

    // check bookmark
    app.get("/api/bookmark/check", async (req, res) => {
      try {
        const { email, bookId } = req.query;

        const result = await bookMarkedCollection.findOne({
          bookmarkUserEmail: email,
          "book._id": bookId,
        });

        res.send({
          isBookmarked: !!result,
        });
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
