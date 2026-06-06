const amqplib = require('amqplib')

let connection, channel;

async function connect(){
    if(connection) return connection;

    try{
        connection = await amqplib.connect(process.env.RABBIT_URL);
        console.log("Connected to rabbitMQ")
        channel = await connection.createChannel();
    }catch(error){
        console.log("Error while connecting to rabbitMQ",error)
    }
}

async function publishToQueue(queueName, data= {}){
    if(!connection || !channel) return connect();

    await channel.assertQueue(queueName,{
        durable:true
    })

    channel.sendToQueue(queueName,Buffer.from(JSON.stringify(data)))

    console.log("Message sent to Queue". queueName, data)
}

async function subscribeToQueue(queueName, callback){
    if(!connection || !channel ) return connect();

    await channel.assertQueue(queueName,{
        durable: true
    })

    channel.consume(queueName, async(msg)=>{
        if(msg !== null){
            const data = JSON.parse(msg.content.toString())
            callback(data);
            channel.ack(msg)
        }
    })
}

module.exports = {
    connection,
    channel,
    connect,
    publishToQueue,
    subscribeToQueue
}