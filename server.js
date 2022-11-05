const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const knex = require("knex");
const bcrypt = require("bcrypt-nodejs");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",

    user: "postgres",
    password: "12345@Temp",
    database: "face_recognition_db",
  },
});

app.use(cors());
app.use(bodyParser.json());

db.select("*")
  .from("users")
  .then((data) => console.log(data));

app.get("/", (req, res) => {
  res.json("its working");
});
//signIn
app.post("/signIn", (req, res) => {
  const { userName, password } = req.body;
  if (!userName || !password) {
    return res.status(400).json("please enter valid details");
  }
  db.select("username", "hash")
    .from("login")
    .where("username", "=", userName)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("username", "=", userName)
          .then((user) => {
            res.json(user[0]);
          })
          .catch(() => {
            res.status(400).json("user not found");
          });
      } else {
        res.status(400).json("wrong credential");
      }
    })
    .catch(() => {
      res.status(404).json("worng credential");
    });
});

//register
app.post("/Register", (req, res) => {
  const { name, userName, password } = req.body;
  if (!name || !userName || !password) {
    return res.status(400).json("please enter vlaid credential");
  }
  const hash = bcrypt.hashSync(password);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        username: userName,
      })
      .into("login")
      .returning("username")
      .then((username) => {
        return trx("users")
          .returning("*")
          .insert({
            name: name,
            username: username[0].username,
            joined: new Date(),
          })
          .then((user) => res.json(user[0]));
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register"));
});

//profile
app.get("/profile/:id", (req, res) => {
  const { id } = req.params;

  db.select("*")
    .from("users")
    .where({
      id,
    })
    .then((response) => {
      if (response.length) {
        res.json(response[0]);
      } else {
        res.status(404).json("not found");
      }
    })
    .catch((err) => res.status(400).json("user not found"));
});

//updateing user entries

app.put("/image", (req, res) => {
  const { id } = req.body;

  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => res.json(entries[0].entries))
    .catch(() => res.status(400).json("something is wrong"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("app running on " + process.env.PORT);
});
