const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const clientId = parseInt(input);
  if (!isNaN(clientId)) {
    // Send client ID to main thread
    parentPort.postMessage(clientId);
  } else {
    console.log('Invalid input. Please enter a valid client ID (a number).');
  }
});
