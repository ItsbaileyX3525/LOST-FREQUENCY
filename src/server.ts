import express from "express";
import { WebSocketServer, WebSocket} from "ws";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const publicPath = path.join(__dirname, "../public");

app.use(express.static(publicPath));

const server = app.listen(PORT);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
	ws.on("message", (message: string) => {
	});
	
	ws.on("close", () => {
	});
});
