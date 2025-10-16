import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import base64url from 'base64url';
import Database from 'better-sqlite3';
import cors from 'cors';

dotenv.config();

const db = new Database('thine_database.db');
db.pragma('journal_mode = WAL'); //I have no idea what this does but apparently makes performance better?

//Make database creation simpler

const schemaPath = "./schema_with_data.sql";
const sql = fs.readFileSync(schemaPath, 'utf8');
db.exec(sql);
console.log("Database created!");

//console.log(process.env.TEST); //Works

const app = express();
//app.use(cors({ origin: 'http://localhost:5173' })); //Test cors
app.use(cors()) //Test cors but more domains or something
app.use(express.json());

const PORT = process.env.PORT || 3001;
const publicPath = path.join(__dirname, "../public");

//Mostly vibecoded ngl (as if I know what any of this does)
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
//End of vibecode


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
const token_parts_encoded: Record<string, string[]> = JSON.parse(process.env.TOKEN_PARTS_ENCODED || '{}');

//console.log(token_parts)
//console.log(token_parts_encoded)

app.use(express.static(publicPath));

app.post("/api/checkDecoded", (_req, res) => { //Cudda just made it get but oh well
    const hashes = [
        "********************",
        "********************",
        "********************",
        "********************",
        "********************",
        "********************",
        "********************",
        "********************",
        "********************",
        "*********************"
    ];
    const row = db.prepare("SELECT * FROM hashes WHERE completedHash = ?").all('true') as { id: number, hash: string }[];
    if (row && row.length > 0) {
        for (let e in row) {
            hashes[row[e].id - 1] = row[e].hash
        }
    }
    res.json({ success: true, hashThusFar: hashes })
})

app.post("/api/hash", (req, res) => { //Get users fingerprint, return random hash from main string
	const { hash } = req.body;

    let randomHash: string | null = null

    //Check if fingerprint has a hash already
    const row = db.prepare("SELECT allocatedHash FROM user_hashes WHERE fingerprint = ?").get(hash) as { allocatedHash: string } | undefined;
    //^ Right, im fed up with typescript... Type saftey thoooooooo
    if (row) {
        randomHash = row?.allocatedHash;
    }

    if (randomHash === null) {
        const values: string[] = []
        for (const [key, value] of Object.entries(token_parts_encoded)) {
            if(!value) return false
            values.push((value as string[])[0])
        }

        const row = db.prepare("SELECT related_encoded FROM hashes WHERE completedHash = ?").all('false') as { related_encoded: string }[] | undefined

        console.log("Valid ciphers: " + row);

        randomHash = values[Math.floor(Math.random() * values.length)]

        if (randomHash === null) {
            console.log("tf happened");
            res.json({ success: false, hash: randomHash });
        }

        const row2 = db.prepare("SELECT hash, completedHash FROM hashes WHERE related_encoded = ?").get(randomHash) as { hash: string, completedHash: string } | undefined
        if (row2?.completedHash === 'true') {
            res.json({ success: true, hash: randomHash, completed_hash: true });
            return
        }

        db.prepare("INSERT INTO user_hashes (fingerprint, allocatedHash) VALUES (?,?)").run(hash, randomHash)

    } else {
        const row2 = db.prepare("SELECT hash, completedHash FROM hashes WHERE related_encoded = ?").get(randomHash) as { hash: string, completedHash: string } | undefined
        if (row2?.completedHash === 'true') {
            res.json({ success: true, hash: randomHash, completed_hash: true });
            return
        }
    }

	res.json({ success: true, hash: randomHash });
});

app.post("/api/submitDecrypted", (req, res) => { //Check if their decrpyted hash from main is right
    const { decrypt, myHash, fingerprint } = req.body;

    const actualHash = db.prepare("SELECT allocatedHash FROM user_hashes WHERE fingerprint = ?").get(fingerprint) as { allocatedHash: string }

    if (actualHash !== myHash) {
        res.json({ success: false, message: "Invalid hashes" })
        return
    }

    const row = db.prepare("SELECT hash, related_encoded FROM hashes WHERE hash = ?").get(decrypt) as { hash: string, related_encoded: string } | undefined;
    if (!row) { //Checks if the deciphered hash exists therefore real
        res.json({ success: false });
        return
    }
    if (row.related_encoded !== myHash) {
        res.json({ success: false, message: "hashes don't match" })
        return
    }
    const stmt = db.prepare("UPDATE hashes SET completedHash = 'true' WHERE hash = ?")
    stmt.run(decrypt)
    res.json({ success: true });

})

app.post('/api/', (req, res) => { //idk yet
    const {} = req.body;
    res.json({ success: true });
})

const server = app.listen(PORT);