require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000
const app = express()
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v0ciw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
const run = async () => {
    try {
        await client.connect()
        const db = client.db("jobbox");
        const userCollection = db.collection("user");
        const jobCollection = db.collection("job");
        //  console.log(uri)


        app.post("/user", async (req, res) => {
            const user = req.body;
            //   console.log(user)

            const result = await userCollection.insertOne(user);

            res.send(result);
        });

        app.get("/users", async (req, res) => {

            const cursor = userCollection.find({});
            const users = await cursor.toArray();

            res.send({ status: true, data: users });
        })

        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;

            const result = await userCollection.findOne({ email });

            if (result?.email) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        app.patch("/apply", async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const appliedDate = req.body.appliedDate;

            const filter = { _id: ObjectId(jobId) };
            const updateDoc = {
                $push: { applicants: { id: ObjectId(userId), email, appliedDate } },
            };

            const result = await jobCollection.updateOne(filter, updateDoc);

            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        app.patch("/query", async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const question = req.body.question;

            const filter = { _id: ObjectId(jobId) };
            const updateDoc = {
                $push: {
                    queries: {
                        id: ObjectId(userId),
                        email,
                        question: question,
                        reply: [],
                    },
                },
            };

            const result = await jobCollection.updateOne(filter, updateDoc);

            if (result?.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        app.patch("/reply", async (req, res) => {
            const userId = req.body.userId;
            const reply = req.body.reply;
            //  console.log(reply);
            //   console.log(userId);

            const filter = { "queries.id": ObjectId(userId) };

            const updateDoc = {
                $push: {
                    "queries.$[user].reply": reply,
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.id": ObjectId(userId) }],
            };

            const result = await jobCollection.updateOne(
                filter,
                updateDoc,
                arrayFilter
            );
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        app.get("/applied-jobs/:email", async (req, res) => {
            const email = req.params.email;
            const query = { applicants: { $elemMatch: { email: email } } };
            const cursor = jobCollection.find(query).project({ applicants: 0 });
            const result = await cursor.toArray();

            res.send({ status: true, data: result });
        });

        app.get("/jobs", async (req, res) => {
            const cursor = jobCollection.find({});
            const result = await cursor.toArray();
            res.send({ status: true, data: result });
        });



        app.get("/job/:id", async (req, res) => {
            const id = req.params.id;
            //  console.log("the id is", `type of id is ${typeof (id)}`, id)


            // const result = await jobCollection.find({ _id: ObjectId(id) });
            const result = await jobCollection.findOne({ _id: ObjectId(id) })
            //   console.log(result)
            res.send({ status: true, data: result });
        });
        app.get("/jobs/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const cursor = jobCollection.find({ email: email })
            const result = await cursor.toArray()
            console.log(result)
            res.send({ status: true, data: result })

            // console.log(result)
            // res.send({ status: true, data: result });
        })
        app.post("/job", async (req, res) => {
            const job = req.body;

            const result = await jobCollection.insertOne(job);

            res.send({ status: true, data: result });
        });
        app.patch("/toggolePos", async (req, res) => {
            // console.log(req.body)

            const jobId = req.body.jobId;
            const toggole = req.body.toggole
            const filter = { _id: ObjectId(jobId) }
            const updateDoc = {
                $set: { isOpen: toggole }
            }

            const result = await jobCollection.updateOne(
                filter,
                updateDoc,

            );
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });
        app.get("/filterByDate/:email", async (req, res) => {
            const email = req.params.email;
            const cursor = jobCollection.aggregate([
                {
                    $match: {
                        applicants: {
                            $elemMatch:
                            {
                                email: email
                            }

                        }
                    }
                },
                {
                    $project: {
                        "postion": 1,
                        "email": 1,
                        "companyName": 1,
                        "experience": 1,
                        "workLevel": 1,
                        "salaryRange": 1,
                        "location": 1,
                        "overView": 1,
                        "skills": 1,
                        "requirements": 1,
                        "queries": 1,
                        "isOpen": 1,

                        applicants: {
                            $filter: {
                                input: '$applicants',
                                as: 'applicants',
                                cond: { $eq: ["$$applicants.email", email] }
                            }
                        }
                    }

                }
            ])
            const filter = cursor.sort({ "applicants.appliedDate": 1 })
            const result = await filter.toArray()
            res.send({ status: true, data: result });
        });
        app.patch("/directMessage", async (req, res) => {

            const userId = req.body.userId;

            const clientId = req.body.clientId;
            const clientEmail = req.body.clientEmail;
            const sendTime = req.body.sendTime;
            const message = req.body.message;

            const filter = { _id: ObjectId(userId) }

            // console.log(filter)
            const filterUser = await userCollection.findOne({ _id: ObjectId(userId), messages: { $elemMatch: { clientId: ObjectId(clientId) } } });

            //  console.log("filter user data:", filterUser)
            //res.send({ status: true, data: filterUser });

            const updateDoc = {
                $push: {
                    messages: {
                        clientId: ObjectId(clientId),
                        clientEmail,


                        message: [{

                            sendTime,
                            message
                        }]

                    },
                },
            };
            const filter2 = { _id: ObjectId(userId), "messages.clientId": ObjectId(clientId) };

            const updateDoc2 = {
                $push: {
                    "messages.$[user].message": {
                        sendTime,
                        message
                    },
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.clientId": ObjectId(clientId) }],
            };
            if (!filterUser) {

                const result = await userCollection.updateOne(filter, updateDoc);

                if (result?.acknowledged) {
                    return res.send({ status: true, data: result });
                }
                else {
                    res.send({ status: false });
                }
            }
            else {
                const result = await userCollection.updateOne(filter2, updateDoc2, arrayFilter);
                if (result?.acknowledged) {
                    return res.send({ status: true, data: result });
                }
                else {
                    res.send({ status: false });
                }

            }
        }),
            app.get("/yourMessage/:clientId/:userId", async (req, res) => {

                const { clientId, userId } = req.params;
                console.log(`
            clientId:${clientId},
            userId:${userId}
            `)
                const cursor = userCollection.aggregate([
                    {
                        $match: {
                            _id: ObjectId(userId)
                        }
                    },
                    {
                        $project: {


                            messages: {
                                $filter: {
                                    input: '$messages',
                                    as: 'message',
                                    cond: { $eq: ["$$message.clientId", ObjectId(clientId)] }
                                }
                            }
                        }

                    }
                ])
                const result = await cursor.toArray()
                res.send({ status: true, data: result })
            })
    } finally {
        // await client.close();
    }
};

run().catch((err) => console.log(err));


app.get("/", (req, res) => {

    res.send("jobbox server is running")
})
app.listen(port, () => {

    console.log(`example app  listenning on port ${port}`);
})