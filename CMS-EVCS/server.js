const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');
const path = require('path'); 

const wss = new WebSocket.Server({ port: 9000 });
let nextClientId = 1;
const clients = new Map();
const EVfilePath = path.join(__dirname, 'EVclientsData.json');

var Total_data = [];

wss.on('connection', (ws) => {
  const clientId = nextClientId++;
  clients.set(clientId, ws);

  console.log(`Client ${clientId} connected`);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log(`Received from client ${clientId}:`, data);

    if (data.action) {
      switch (data.action) {
        case 'BootNotification':
          handleBootNotification(clientId, data.payload);
          break;
        case 'Heartbeat':
          handleHeartbeat(clientId);
          break;
        case 'AuthorizeEVchargingSession':
          handleEVchargingClient(data.EVclientID,data.EVCS_id, data.EVwatts, data.EVtime);
          break;
        default:
          console.log(`Unknown action from client ${clientId}:`, data.action);
      }
    } else {
      console.log(`Unknown message format from client ${clientId}:`, data);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

function handleBootNotification(clientId, payload) {
  console.log(`BootNotification received from client ${clientId}:`, payload);
  const responsePayload = {
    status: 'Accepted',
    currentTime: new Date().toISOString(),
    interval: 300,
  };
  Total_data.push({clientId:clientId, payload:payload});
  sendResponse(clientId, 'BootNotification', responsePayload);
}

function handleHeartbeat(clientId) {
  Total_data.push({heartBeat:clientId});
  console.log(`Responding to the client ${clientId}`);
}

function sendResponse(clientId, action, payload) {
  const ws = clients.get(clientId);
  if (ws) {
    const response = {
      action,
      payload,
    };
    ws.send(JSON.stringify(response));
    console.log(`Sent response to client ${clientId}:`, response);
  } else {
    console.log(`Client ${clientId} not found`);
  }
}

async function fetchDataAndUpdate() {
  try {
      const response = await axios.get('http://localhost:3000/nextFirmwareUpdate');
      const data = response.data;
      handleResponse(data);
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}

function handleResponse(data) {
  if (data.clientId === "") {
      console.log("clientId is empty, nothing to do.");
  } else if (!isNaN(data.clientId)) {
      console.log("clientId is a number, calling a function with value:", data.clientId);
      const responsePayload = {
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        version: "1.0.1",
        updates: "Testing update functionality..."
      };
      Total_data.push({responsePayload:responsePayload});
      sendResponse(Number(data.clientId), "FirmwareUpdate", responsePayload); 
  }
}

setInterval(fetchDataAndUpdate, 1000);

function handleEVchargingClient(data,EVCS_id,EVwatts,EVtime){
  const jsonData = fs.readFileSync(EVfilePath,'utf-8');
  const evData = JSON.parse(jsonData);
  let length = evData.length;
  for(let i = 0 ; i < length; i++) {
    if(evData[i].EVclientID == data) {
      const evToUpdate = evData.find(ev => ev.EVclientID == data);
      evToUpdate.status = 1;
      evToUpdate.EVCS_id = EVCS_id;
      evToUpdate.EVwatts = EVwatts;
      evToUpdate.EVtime = EVtime;
      const updatedJsonData = JSON.stringify(evData, null, 2);
      fs.writeFileSync(EVfilePath, updatedJsonData, 'utf-8');
      console.log(`[Authorization successfull]: EV_id ${data} is Accepted for the charging session..`);
      return;
    }
  }
  console.log(`[Authorization failed]: EV vehicle with id ${data} is Rejected for the charging session..`);
}

function logCurrentlyActiveEVs() {
  const jsonData = fs.readFileSync(EVfilePath,'utf-8');
  const evData = JSON.parse(jsonData);
  let length = evData.length;
  console.log("CONNECTED CLIENT DATA------------------------------->");
  for (let i = 0 ; i < length ; i++) {
    if(evData[i].status == 1) {
      console.log(`[LOG]: {EVclientID: ${evData[i].EVclientID} , EVCS_ID: ${evData[i].EVCS_id} , EVwatts: ${evData[i].EVwatts}, EVtime: ${evData[i].EVtime}}`);
    }
  }
  console.log("<--------------------------------------------------->");
}

setInterval(logCurrentlyActiveEVs, 20000);


async function remoteStopTransaction() {
  try {
    const response = await axios.get('http://localhost:3000/remoteStopTransaction');
    const data = response.data.remoteStopId;
    if(data != undefined){
      const jsonData = fs.readFileSync(EVfilePath,'utf-8');
      const evData = JSON.parse(jsonData);
      const evToUpdate = evData.find(ev => ev.EVclientID == data);
      evToUpdate.status = 0;
      const updatedJsonData = JSON.stringify(evData, null, 2);
      fs.writeFileSync(EVfilePath, updatedJsonData, 'utf-8');
      console.log(`[Stopped Transaction]: EV_id ${data} is Stopped Its Transaction...`);
      return;
    }
} catch (error) {
    console.error('Error fetching data:', error);
}
}

setInterval(remoteStopTransaction, 10000);

function sendDataToDigitalTwinServer() {
  axios.post('/serverLog', Total_data)
  .then(response => {
    console.log('POST request successful:', response.data);
  })
  .catch(error => {
    console.error('Error making POST request:', error);
  });
}

// setInterval(sendDataToDigitalTwinServer, 10000);

