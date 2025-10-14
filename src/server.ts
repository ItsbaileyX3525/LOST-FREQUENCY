import express from "express";
import { WebSocketServer, WebSocket} from "ws";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import base64url from 'base64url';
import Database from 'better-sqlite3';

dotenv.config();

//console.log(process.env.TEST); //Works

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const publicPath = path.join(__dirname, "../public");

function generateFernetKey() {
    const key = crypto.randomBytes(32);
    return base64url.encode(key);
}

function encryptFernet(message: string, base64Key: string): string {
    const key = Buffer.from(base64url.toBuffer(base64Key));
    const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-128-cbc', key.subarray(0, 16), iv);
	const encrypted = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);
	const hmac = crypto.createHmac('sha256', key.subarray(16)).update(Buffer.concat([iv, encrypted])).digest();
	return base64url.encode(Buffer.concat([iv, encrypted, hmac]));
}

function decryptFernet(token: string, base64Key: string): string {
    const key = Buffer.from(base64url.toBuffer(base64Key));
    const data = Buffer.from(base64url.toBuffer(token));
    const iv = data.subarray(0, 16);
    const encrypted = data.subarray(16, data.length - 32);
    const hmac = data.subarray(data.length - 32);

	const expected = crypto.createHmac('sha256', key.subarray(16)).update(Buffer.concat([iv, encrypted])).digest();
	if (!crypto.timingSafeEqual(hmac, expected)) throw new Error('Invalid token (HMAC mismatch)');

	const decipher = crypto.createDecipheriv('aes-128-cbc', key.subarray(0, 16), iv);
	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return decrypted.toString('utf8');
}

//const key = generateFernetKey();
//const token = encryptFernet('Im not telling you the message LOL', key);
//console.log("Key: " + key);
//console.log("Token: " + token)

/////// UHHHHH SO CONFUSING THERE IS SO MUCH TO KEEP TRACK OF!
////////////////// IM GONNA HAVE TO ACTUALLY USE COMMENTS
// (comments urghh)

const key = process.env.FERNET_KEY
const finalToken = process.env.FERNET_TOKEN;
const token_parts = JSON.parse(process.env.TOKEN_PARTS || '[]');
const token_parts_encoded = JSON.parse(process.env.TOKEN_PARTS_ENCODED || '[]');

//console.log(token_parts)
//console.log(token_parts_encoded)

app.use(express.static(publicPath));

app.post("/api/hash", (req, res) => { //Get users fingerprint, return random hash from main string
	const { userHash } = req.body;

    

	res.json({ success: true });
});

app.post("/api/submitDecrypted", (req, res) => { //Check if their decrpyted hash from main is right
    const { decrpyt, which } = req.body;
    res.json({ success: true });
})

app.post('/api/', (req, res) => { //idk yet
    const {} = req.body;
    res.json({ success: true });
})

const server = app.listen(PORT);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
	ws.on("message", (message: string) => {
	});
	
	ws.on("close", () => {
	});
});
