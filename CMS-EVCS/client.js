const WebSocket = require('ws');
const { BootNotificationRequestSchema, HeartbeatResponseSchema } = require('zod-ocpp');
const axios = require('axios');
const now = new Date();


const ws = new WebSocket('ws://localhost:9000');
const requestPayload = {
  chargePointVendor: 'VendorX',
  chargePointModel: 'ModelA',
  chargePointSerialNumber: '123456789',
  chargeBoxSerialNumber: '987654321',
  firmwareVersion: '1.2.3',
  iccid: '89012345678901234567',
  imsi: '123456789012345',
  meterType: 'Metertype1',
  meterSerialNumber: 'ABC123',
};

ws.on('open', () => {
  console.log('Connected to OCPP Server');
  sendBootNotification();
  setInterval(sendHeartbeat, 5000);
});

ws.on('message', (message) => {
  const data = JSON.parse(message);
  console.log('Received from server:', data);

  // Check if the server response contains a known action
  if (data.action) {
    switch (data.action) {
      case 'BootNotification':
        handleBootNotificationResponse(data.payload);
        break;
      case 'FirmwareUpdate':
        handleFirmwareUpdate(data.payload);
        break;
      // Add cases for other actions if needed
      default:
        console.log('Unknown action from server:', data.action);
    }
  } else {
    console.log('Unknown message format from server:', data);
  }
});

function sendBootNotification() {

  const result = BootNotificationRequestSchema.safeParse(requestPayload);

  if (result.success) {
    console.log("Command line arguments:----------------------_>", process.argv);
    const bootNotification = {
      action: 'BootNotification',
      payload: requestPayload,
      clientId: process.argv[2],
    };
    ws.send(JSON.stringify(bootNotification));
  } else {
    console.error('Invalid BootNotification payload:', result.error.errors);
  }
}

function handleBootNotificationResponse(response) {
  console.log('BootNotification response:', response);
}

function handleFirmwareUpdate(response) {
  console.log('Firmware Update Response:', response);
}

function sendHeartbeat() {
  const nowUtc = new Date();
  const yearUtc = nowUtc.getUTCFullYear();
  const monthUtc = nowUtc.getUTCMonth() + 1;
  const dayUtc = nowUtc.getUTCDate();
  const hoursUtc = nowUtc.getUTCHours();
  const minutesUtc = nowUtc.getUTCMinutes();
  const secondsUtc = nowUtc.getUTCSeconds();
  const formattedUtcDateTime = `${yearUtc}-${padNumber(monthUtc)}-${padNumber(dayUtc)} ${padNumber(hoursUtc)}:${padNumber(minutesUtc)}:${padNumber(secondsUtc)} UTC`;
  console.log('Sent Heartbeat to server');
  console.log(`Data Received from Server: { Date: ${formattedUtcDateTime} }`);
  const heartbeatRequest = {
    action: 'Heartbeat',
    payload: HeartbeatResponseSchema.safeParse({}).data,
    clientId: process.argv[2],
  };
  ws.send(JSON.stringify(heartbeatRequest));
}

function padNumber(num) {  return num.toString().padStart(2, '0'); }



async function sendEVauthorizationRequest() {
  try {
    const response = await axios.get('http://localhost:3000/nextEVsession');
    const data = response.data.EVClientData; 
    handleResponse(data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function handleResponse(data) {
  if (data) {
    data['action'] = 'AuthorizeEVchargingSession';
    ws.send(JSON.stringify(data));
    console.log(data);
  }
}

setInterval(sendEVauthorizationRequest, 1000);