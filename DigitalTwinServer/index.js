const express = require('express');
const bodyParser = require("body-parser");

const path = require('path'); 
const app = express();

let nextClientId = [];
let nextEVClientId = [];
let remoteStopId = [];

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

const filePath1 = path.join(__dirname, 'index.html');
const filePath2 = path.join(__dirname, 'EV.html');
const filePath3 = path.join(__dirname, 'remoteStopTransaction.html');

app.get('/', (req, res) => { 
    res.sendFile(filePath1);
});


app.get('/ev', (req, res) => { 
    res.sendFile(filePath2);
});

app.post('/ev', (req,res)=> {
    const EVClientData = {
        EVCS_id:req.body.EVCS_id,
        EVclientID: req.body.id,
        EVwatts: req.body.watts,
        EVtime: req.body.time
    };
    nextEVClientId.push(EVClientData);
    console.log(EVClientData);
    res.sendFile(filePath2);
});

app.get('/nextEVsession', (req, res) => {
    res.json({ EVClientData: nextEVClientId.shift()}); 
});

app.post('/firmwareUpdate', (req, res) => {
    const clientId = req.body.client_id;
    console.log('Client ID:', clientId);
    nextClientId.push(clientId);
    res.sendFile(filePath1);
});

app.get('/nextFirmwareUpdate', (req, res) => {
    res.json({ clientId: nextClientId.shift()});
    
});

app.get("/RemoteStop" , (req,res)=> {
    res.sendFile(filePath3);
});

app.post("/RemoteStop" , (req,res)=> {
    remoteStopId.push(req.body.remote_stop);
    console.log(remoteStopId);
    res.sendFile(filePath3);
});

app.get('/remoteStopTransaction', (req,res)=> {
    res.json({ remoteStopId: remoteStopId.shift()}); 
});

// app.post("/serverLog",(req,res)=>{
//     console.log(req.body);
//     console.log("data from the CMS Server LOGGED Here:");
// });

// Start the server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
