(async () => {
  try {
    const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = await import("@whiskeysockets/baileys");
    const fs = await import('fs');
    const pino = (await import('pino')).default;

    const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });
    const question = (text) => new Promise((resolve) => rl.question(text, resolve));

    // ANSI color codes
    const reset = "\x1b[0m"; // Reset to default
    const green = "\x1b[1;32m"; // Green
    const yellow = "\x1b[1;33m"; // Yellow

    // Logo
    const logo = `${green}
 __    __ _           _                         
/ /\\ /\\ \\ |__   __ _| |_ ___  __ _ _ __  _ __  
\\ \\/  \\/ / '_ \\ / _\` | __/ __|/ _\` | '_ \\| '_ \\ 
 \\  /\\  /| | | | (_| | |\\__ \\ (_| | |_) | |_) |
  \\/  \\/ |_| |_|\\__,_|\\__|___/\\__,_| .__/| .__/ 
                                   |_|   |_|    
============================================
[~] Author  : HASSAN RAJPUT
[~] GitHub  : HassanRajput0
[~] Tool  : Automatic WhatsApp Massage Sender
============================================`;

    // Function to clear the terminal screen and display the logo
    const clearScreen = () => {
      console.clear();
      console.log(logo);
    };

    // Variables to store input data
    let targetNumber = null;
    let groupUIDs = [];
    let messages = null;
    let intervalTime = null;
    let haterName = null;

    // Using multi-file auth state
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info'); // This is where the session will be stored

    // Function to send messages in sequence
    async function sendMessages(MznKing) {
      while (true) { // Infinite loop for continuous sending
        for (const message of messages) {
          try {
            // Get the current time
            const currentTime = new Date().toLocaleTimeString();

            // Combine hater name with the message
            const fullMessage = `${haterName} ${message}`;

            if (targetNumber) {
              // Send the message to a target number
              await MznKing.sendMessage(targetNumber + '@c.us', { text: fullMessage });
              console.log(`${green}Target Number => ${reset}${targetNumber}`);
            } else {
              // Send the message to all selected WhatsApp groups
              for (const groupUID of groupUIDs) {
                await MznKing.sendMessage(groupUID + '@g.us', { text: fullMessage });
                console.log(`${green}Group UID => ${reset}${groupUID}`);
              }
            }

            // Log the message details
            console.log(`${green}Time => ${reset}${currentTime}`);
            console.log(`${green}Message => ${reset}${fullMessage}`);
            console.log('    [ =============== HASSAN RAJPUT WP LOADER =============== ]');

            // Wait for the specified delay before sending the next message
            await delay(intervalTime * 1000);
          } catch (sendError) {
            console.log(`${yellow}Error sending message: ${sendError.message}. Retrying...${reset}`);
            await delay(5000); // Wait before retrying to send the same message
          }
        }
      }
    }

    // Function to connect to WhatsApp
    const connectToWhatsApp = async () => {
      const MznKing = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state, // Use the in-memory state
      });

      // Prompt for pairing code if not already defined
      if (!MznKing.authState.creds.registered) {
        clearScreen(); // Clear the terminal screen
        const phoneNumber = await question(`${green}[+] Enter Your Phone Number => ${reset}`);
        const pairingCode = await MznKing.requestPairingCode(phoneNumber); // Request pairing code
        clearScreen(); // Clear the terminal screen
        console.log(`${green}[√] Your Pairing Code Is => ${reset}${pairingCode}`);
      }

      // Connection updates
      MznKing.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;

        if (connection === "open") {
          clearScreen(); // Clear the terminal screen
          console.log(`${green}[Your WhatsApp Login ✓]${reset}`);

          // Ask if the user wants to send to a number or a WhatsApp group
          const sendOption = await question(`${green}[1] Send to Target Number\n[2] Send to WhatsApp Group\nChoose Option => ${reset}`);

          if (sendOption === '1') {
            targetNumber = await question(`${green}[+] Enter Target Number => ${reset}`);
          } else if (sendOption === '2') {
            // Fetch and display group UIDs along with group names
            const groupList = await MznKing.groupFetchAllParticipating(); // Fetch all groups
            const groupUIDsList = Object.keys(groupList);
            console.log(`${green}[√] WhatsApp Groups =>${reset}`);
            groupUIDsList.forEach((uid, index) => {
              console.log(`${green}[${index + 1}] Group Name: ${reset}${groupList[uid].subject} ${green}UID: ${reset}${uid}`);
            });

            // Ask how many groups to target
            const numberOfGroups = await question(`${green}[+] How Many Groups to Target => ${reset}`);
            for (let i = 0; i < numberOfGroups; i++) {
              const groupUID = await question(`${green}[+] Enter Group UID ${i + 1} => ${reset}`);
              groupUIDs.push(groupUID); // Add group UID to the list
            }
          }

          // Ask for remaining details
          const messageFilePath = await question(`${green}[+] Enter Message File Path => ${reset}`);
          messages = fs.readFileSync(messageFilePath, 'utf-8').split('\n').filter(Boolean);
          haterName = await question(`${green}[+] Enter Hater Name => ${reset}`);
          intervalTime = await question(`${green}[+] Enter Message Delay => ${reset}`);

          // Confirm details before starting
          console.log(`${green}All Details Are Filled Correctly${reset}`);
          clearScreen(); // Clear the terminal screen
          console.log(`${green}Now Start Message Sending.......${reset}`);
          console.log('      [ =============== HASSAN RAJPUT WP LOADER =============== ]');
          console.log('');

          // Start sending messages continuously
          await sendMessages(MznKing);
        }

        // Handle network issues and reconnect
        if (connection === "close" && lastDisconnect?.error) {
          const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            console.log("Network issue, retrying in 5 seconds...");
            setTimeout(connectToWhatsApp, 5000); // Reconnect after 5 seconds
          } else {
            console.log("Connection closed. Please restart the script.");
          }
        }
      });

      MznKing.ev.on('creds.update', saveCreds); // Save credentials to auth_info
    };

    // Initial connection
    await connectToWhatsApp();

    // Handle uncaught exceptions
    process.on('uncaughtException', function (err) {
      let e = String(err);
      if (e.includes("Socket connection timeout") || e.includes("rate-overlimit")) return;
      console.log('Caught exception: ', err);
    });

  } catch (error) {
    console.error("Error importing modules:", error);
  }
})();
