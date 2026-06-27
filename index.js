const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();
const port = process.env.PORT || 8000;
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({
      success: false,
      message: "No token provided",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    console.log(req.user, "from backend verifytoken user");
    console.log(payload, "from backend verifytoken payload");

    next();
  } catch (error) {
    console.log(error);
    return res.status(401).send({
      success: false,
      message: "Invalid token",
    });
  }
};

// Writers verfication
const verifyWriters = async (req, res, next) => {
  const writers = req.user;
  if (writers.role !== "Writer") {
    return res.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
  console.log(req.user, "from backend verifywriters (writers)");
  next();
};

//Admin verification
const verifyAdmin = async (req, res, next) => {
  const admin = req.user;
  if (admin.role !== "Admin") {
    return res.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
  console.log(req.user, "from backend verifyadmin (admin)");
  next();
};

//Readers verification
const verifyReaders = async (req, res, next) => {
  const readers = req.user;
  if (readers.role !== "Reader") {
    return res.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
  console.log(req.user, "from backend verifyreaders (readers)");
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("Novara");
    const writersCollection = db.collection("writers");
    const userCollection = db.collection("user");
    const bookMarkedCollection = db.collection("bookMarked");
    const paymentCollection = db.collection("payment");
    // console.log('usercollection',userCollection);

    // admin manage users page api call for get all users by admin
    app.get("/api/user", verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch("/api/update-profile/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const { name, image } = req.body;

        console.log("ID:", id);
        console.log("BODY:", req.body);

        const result = await userCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              name: name,
              image: image,
              updatedAt: new Date(),
            },
          },
        );

        console.log("UPDATE RESULT:", result);

        res.send({
          success: true,
          message: "Profile updated successfully",
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,
          message: "server error",
        });
      }
    });

    // writer profile (public page) get api by writer id
    app.get("/api/user/writer/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // admin manage users page api call for get all users by admin
    app.patch("/api/user/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // admin manage users page api call for get all users by admin
    app.delete("/api/user/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // Featured books page (home page)
    app.get("/api/featured-books", async (req, res) => {
      try {
        const query = {
          status: "published",
        };
        const result = await writersCollection
          .find(query)
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // admin manage ebooks page api call for get all books by writer
    app.get(
      "/api/writers/admin",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const result = await writersCollection.find({}).toArray();
          res.send(result);
        } catch (error) {
          res.status(500).send({
            success: false,
            message: error.message,
          });
        }
      },
    );

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

    // writers (home page & manage books page) api call for get all books by writer
    app.get(
      "/api/writers/books/my/:id",
      verifyToken,
      verifyWriters,
      async (req, res) => {
        try {
          const writerId = req.params.id;

          const query = {
            id: writerId,
          };

          const result = await writersCollection.find(query).toArray();

          res.send(result);
        } catch (error) {
          res.status(500).send({
            success: false,
            message: error.message,
          });
        }
      },
    );

    // writer profile page (public page)
    app.get(
      `/api/writers/profile/:id`,

      async (req, res) => {
        try {
          const writerId = req.params.id;

          const query = {
            id: writerId,
          };

          const result = await writersCollection.find(query).toArray();

          res.send(result);
        } catch (error) {
          res.status(500).send({
            success: false,
            message: error.message,
          });
        }
      },
    );

    // writers add book page api call for create a book
    app.post("/api/writers", verifyToken, verifyWriters, async (req, res) => {
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

    // writers manage books page api call for get all books by writer
    app.delete(
      "/api/writers/:id",
      verifyToken,
      verifyWriters,
      async (req, res) => {
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
      },
    );

    // admin manage books apge
    app.delete(
      "/api/writers/delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      },
    );

    // writers manage books page(modal data update)
    app.patch("/api/writers/update/:id", async (req, res) => {
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

    // writers manage books page ( status update)
    app.patch("/api/writers/change-status/:id", async (req, res) => {
      try {
        const { status } = req.body;
        const bookId = req.params.id;
        const filter = { _id: new ObjectId(bookId) };
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

    //admin manage books page status update
    app.patch(
      "/api/writers/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
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
      },
    );

    // book marked routes (  add bookmark)
    app.post("/api/bookmark", async (req, res) => {
      try {
        const data = req.body;

        const alreadyBookmarked = await bookMarkedCollection.findOne({
          userId: data.userid,
          bookId: data.bookId,
        });

        if (alreadyBookmarked) {
          return res.status(400).send({
            success: false,
            message: "Bookmark already exists",
          });
        }
        // data.userId = new ObjectId(data.userId);
        // data.bookId = new ObjectId(data.bookId);

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

    // writers (home page & bookmark page) api call for get all bookmarks by writer
    app.get(
      "/api/bookmark/writer",
      verifyToken,
      verifyWriters,
      async (req, res) => {
        try {
          const { writerId } = req.query;
          // console.log(writerId, "from bookmark!!!");

          const result = await bookMarkedCollection
            .aggregate([
              {
                $match: {
                  writerId: writerId,
                },
              },

              {
                $addFields: {
                  convertedBookId: { $toObjectId: "$bookId" },
                },
              },

              {
                $lookup: {
                  from: "writers", // your books collection name

                  localField: "convertedBookId", // the field in your books collection

                  foreignField: "_id",

                  as: "book",
                },
              },

              {
                $unwind: "$book",
              },
            ])
            .toArray();
          // console.log(result, "from bookmark");

          res.send(result);
        } catch (error) {
          res.status(500).send({
            message: error.message,
          });
        }
      },
    );

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
    app.get(
      "/api/bookmarks/my/:id",
      verifyToken,
      verifyReaders,
      async (req, res) => {
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
      },
    );

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

      // update isSold in writers collection
      const updateBook = await writersCollection.updateOne(
        { _id: new ObjectId(bookId) },
        {
          $set: {
            isSold: true,
          },
        },
      );
      res.send({
        message: "payment added successfully",
        success: true,
        updateBook,
      });
    });

    // writers (home page & sales history page) api call for get all books by writer
    app.get(
      "/api/sales-history",
      verifyToken,
      verifyWriters,
      async (req, res) => {
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
      },
    );

    // readers purchasesd page api call for get all purchases by user
    app.get(
      "/api/payment/my/:id",
      verifyToken,
      verifyReaders,
      async (req, res) => {
        try {
          const userId = req.params.id;
          // console.log(userId, "from purchases");

          const result = await paymentCollection
            .aggregate([
              {
                $match: {
                  userId: userId,
                },
              },
              {
                $addFields: {
                  convertedBookId: { $toObjectId: "$bookId" },
                },
              },
              {
                $lookup: {
                  from: "writers",
                  localField: "convertedBookId",
                  foreignField: "_id",
                  as: "book",
                },
              },
              { $unwind: "$book" },
            ])
            .toArray();

          // console.log(result, "from purchases");
          res.send(result);
        } catch (error) {
          res.status(500).send({
            success: false,
            message: error.message,
          });
        }
      },
    );

    // book details page api call for get all purchases by user
    app.get("/api/purchases/my", async (req, res) => {
      const { userId } = req.query;
      const result = await paymentCollection.find({ userId }).toArray();
      // console.log(result, "from purchases");
      res.send(result);
    });

    // admin transactions page api call for get all transactions by  user
    app.get("/api/transactions", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find({}).toArray();
      res.send(result);
    });

    // pagination api call for get all books
    app.get("/api/paginations", async (req, res) => {
      const {
        search,
        genre,
        price,
        status,
        page = 1,
        limit = 8,
        sort,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const query = {};

      // search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { writerName: { $regex: search, $options: "i" } },
        ];
      }

      // genre functionality
      // Genre filter
      if (genre) {
        query.genre = genre;
      }
      // price filter
      if (price) {
        const [min, max] = price.split("-");

        query.price = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }

      // Availability filter
      if (status) {
        if (status === "sold") {
          query.isSold = true;
        }

        if (status === "unsold") {
          query.isSold = false;
        }
      }

      //sort functionality
      let sortQuery = {};

      // newest first
      if (sort === "newest") {
        sortQuery = {
          createdAt: -1,
        };
      }

      // low price
      if (sort === "price-low") {
        sortQuery = {
          price: 1,
        };
      }

      // high price
      if (sort === "price-high") {
        sortQuery = {
          price: -1,
        };
      }

      const result = await writersCollection
        .find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .toArray();

      const totalData = await writersCollection.countDocuments(query);
      const totalPages = Math.ceil(totalData / Number(limit));
      res.send({ data: result, page: Number(page), totalPages });
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
