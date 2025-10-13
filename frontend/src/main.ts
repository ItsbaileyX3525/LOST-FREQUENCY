const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 3001}`);

ws.onopen = () => {
	ws.send(JSON.stringify({ type: "init", timestamp: Date.now() }));
};

ws.onmessage = (event) => {
};

ws.onerror = (error) => {
};

ws.onclose = () => {
};