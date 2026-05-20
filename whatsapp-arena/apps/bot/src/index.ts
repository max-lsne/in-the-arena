import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { onMessage } from "./handlers/onMessage.js";
import { startScanner } from "./scanner/loop.js";
import { startSender } from "./sender/loop.js";

const { Client, LocalAuth } = pkg;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./sessions" }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("Scan this QR with WhatsApp > Linked devices:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp client ready");
  startScanner();
  startSender(client);
});

client.on("message", (msg) => onMessage(client, msg));

client.initialize();
