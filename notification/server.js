require('dotenv').config();
const app = require('./src/app')



app.listen(3006, ()=>{
    console.log("Server is running on port no 3006")
})