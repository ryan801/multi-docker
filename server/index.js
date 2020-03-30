//get all keys from the keys.js file
const keys = require('./keys');

//express app setup
    //libraries that are required, versions defined in package.json file
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
/*
create an obj to receive and respond to any 
http requests that are coming or going back to 
the react application 
*/
const app = express();
//cors - cross origin resrc sharing
//allows for requests from one domain to a diff domain or port (where api is hosted)
app.use(cors());
app.use(bodyParser.json());

//create and conn to postgres client svr
const { Pool } = require('pg');
const pgClient = new Pool({
    //pass in env vars defined in keys.js
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
//error listener
pgClient.on('error', () => console.log('Lost PG connection'));
 
//conn to sql db, need a table to store values/indicies
//number is the index of the submitted value from react app
pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err));

//conn to redis express api client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
//create a duplicate file for listeners or publishers
const redisPublisher = redisClient.duplicate();

//express route handlers
    //test route
    app.get('/', (req, res) => {
        res.send('Hi');
    });
    //query postgres for all values sent to app
    app.get('/values/all', async (req,res) => {
        const values = await pgClient.query('SELECT * FROM values');
        //don't send info about the query itself, just values in rows
        res.send(values.rows);
    });
    //get handler
    app.get('/values/current', async (req,res) => {
        redisClient.hgetall('values', (err,values) => {
            res.send(values);
        });
    });
    //receive new values from react application
    app.post('/values', async (req,res) => {
        const index = req.body.index;
        //ensure index is <40 for resrc protection
        if (parseInt(index) > 40) {
            return res.status(422).send('Index too high');
        }
        redisClient.hset('values', index, 'Nothing yet!');
        redisPublisher.publish('insert', index);
        pgClient.query('INSERT INTO values(number) VALUES $1, [index]');

        res.send({working: true });
    });

    app.listen(5000, err => {
        console.log('Listeneing');
    });
