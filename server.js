import * as dotenv from 'dotenv'
import express  from "express";
import bodyParser from "body-parser";
import cors from 'cors'
import knex from "knex";
import bcrypt from 'bcrypt'

dotenv.config()
const app = express();
const saltRounds=10;


const db = knex({
  client: "pg",
  connection: {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  },
});

app.use(cors());
app.use(bodyParser.json());


//signIn
app.post("/signIn", (req, res) => {
  const { userName, password } = req.body;
  if (!userName || !password) {
    return res.status(400).json("please enter valid details");
  }

db.select("username", "hash").from("login")
  .where("username", "=", userName)
    .then((data) => {
      bcrypt.compare(password,data[0].hash, function(err, result) {
        // result returns true or false after matching password
        if (result ==true) {
          return db
            .select("*")
              .from("users")
                .where("username", "=", userName)
                  .then((user) => {
                    res.json(user[0]);
                  }).catch(() => {res.status(400).json("user not found");});
        } else {res.status(400).json("wrong credential");}
      });
      
    }).catch(() => {res.status(404).json("worng credential");});
});

//register
app.post("/Register", (req, res) => {
  const { name, userName, password } = req.body;
  if (!name || !userName || !password) {
    return res.status(400).json("please enter vlaid credential");
  }

   bcrypt.hash(password,saltRounds,function(err,hash){
    
    if(err)return res.status(400).json('Something went wrong!');

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
  })
  
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

app.listen(process.env.PORT || 4000, () => {
  console.log("app running on " + (process.env.PORT||4000));
});
