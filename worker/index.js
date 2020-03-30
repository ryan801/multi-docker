const keys = require('./keys');

//logic for redis connection
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    //if conn is lost, attempt reconn every 1000ms
    retry_strategy: () => 1000
});

//sub indicating a subscription
const sub = redisClient.duplicate();

//function to calculate the fib value based on given index
//not the most effecient manner in doing this
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}

//run callback function when getting a msg
sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
});
sub.subscribe('insert');