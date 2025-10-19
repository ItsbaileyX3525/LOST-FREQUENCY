import express from "express";
import https from 'https';
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import base64url from 'base64url';
import Database from 'better-sqlite3';
import cors from 'cors';

dotenv.config({ quiet: true });

const db = new Database('thine_database.db');
db.pragma('journal_mode = WAL'); //I have no idea what this does but apparently makes performance better?

//Make database creation simpler
if (true) {
    const schemaPath = "./schema_with_data.sql";
    const sql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(sql);
    console.log("Database created!");    
}


//console.log(process.env.TEST); //Works

const app = express();
//app.use(cors({ origin: 'http://localhost:5173' })); //Test cors
app.use(cors()) //Test cors but more domains or something
app.use(express.json());

const PORT = process.env.PORT || 3001;
const publicPath = path.join(__dirname, "../public");

/////// UHHHHH SO CONFUSING THERE IS SO MUCH TO KEEP TRACK OF!
////////////////// IM GONNA HAVE TO ACTUALLY USE COMMENTS
// (comments urghh)

app.use(express.static(publicPath));

// Middleware to serve HTML files without .html extension
app.use((req, res, next) => {
    if (!req.path.includes('.') && req.path !== '/') {
        const htmlPath = path.join(publicPath, req.path + '.html');
        if (fs.existsSync(htmlPath)) {
            return res.sendFile(htmlPath);
        }
    }
    next();
});

app.post("/api/checkDecoded", (_req, res) => { //Cudda just made it get but oh well
    const gameCheck = db.prepare("SELECT completed FROM completed_game").get() as { completed: string }
    if (gameCheck.completed === 'true') {
        res.json({ success: true, message: "Game already complete" })
        return
    }

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

        const row = db.prepare("SELECT related_encoded FROM hashes WHERE completedHash = ?").all('false') as { related_encoded: string }[] | undefined
        if (!row) {
            res.json({ success: false, message: "Game completed already... I think" })
            return
        }

        for (let e of row) {
            values.push(e.related_encoded)
        }

        randomHash = values[Math.floor(Math.random() * values.length)]

        if (randomHash === null) {
            console.log("tf happened");
            res.json({ success: false, message: "Something weird happened", hash: randomHash });
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
    if (actualHash.allocatedHash !== myHash) {
        res.json({ success: false, message: "Invalid hashes" })
        return
    }

    //ngl spent like 20 mins on this nomralize thing for chazza to fix in a second
    const normalizedDecrypt = (decrypt || '').replace(/\s+/g, '').toString();
    const row = db.prepare(`
        SELECT hash, related_encoded
        FROM hashes
        WHERE REPLACE(hash, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE

        UNION

        SELECT hash, related_encoded
        FROM hashes
        WHERE REPLACE(shortened, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE
        AND NOT EXISTS (
            SELECT 1 FROM hashes
            WHERE REPLACE(hash, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE
        )
        LIMIT 1
    `).get(normalizedDecrypt, normalizedDecrypt, normalizedDecrypt) as { hash: string, related_encoded: string } | undefined;
    
    if (!row) { //Checks if the deciphered hash exists therefore real
        res.json({ success: false, message: "Incorrect hash, try again!" });
        return
    }
    
    if (row.related_encoded !== myHash) {
        res.json({ success: false, message: "Incorrect hash, try again!" })
        return
    }
    const stmt = db.prepare(`
        UPDATE hashes
        SET completedHash = 'true'
        WHERE (
            REPLACE(hash, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE
        ) OR (
            REPLACE(shortened, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE
            AND NOT EXISTS (
                SELECT 1 FROM hashes
                WHERE REPLACE(hash, ' ', '') = REPLACE(?, ' ', '') COLLATE NOCASE
            )
        )
    `)
    stmt.run(normalizedDecrypt, normalizedDecrypt, normalizedDecrypt)
    res.json({ success: true });

})

app.post('/api/submitFinal', (req, res) => { //end game thing
    let { decodedHash } = req.body;
    decodedHash = decodedHash.trim()
    if (decodedHash !== process.env.DECRYPTED) {
        res.json({ success: false, message: "Incorrect hash" })
        return;
    }

    db.prepare("UPDATE completed_game SET completed = 'true'").run()

    res.json({ success: true, message: "Congrats on beating the game!" });
})

// Start server: prefer HTTPS if certs are available, otherwise HTTP
const certPath = path.join(__dirname, "../certs/cert.pem");
const keyPath = path.join(__dirname, "../certs/key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
        const cert = fs.readFileSync(certPath);
        const key = fs.readFileSync(keyPath);
        const httpsServer = https.createServer({ key, cert }, app);
        httpsServer.listen(PORT, () => {
            console.log(`HTTPS server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start HTTPS server, falling back to HTTP:', err);
        const server = app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));
    }
} else {
    const server = app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));
}