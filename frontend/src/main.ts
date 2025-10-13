//Server stuff
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 3001}`);

//Client stuff
const fingerprintText = document.getElementById("fingerprint") as HTMLParagraphElement;

ws.onopen = () => {
    ws.send(JSON.stringify({ type: "init", timestamp: Date.now() }));
};

ws.onmessage = (event) => {
};

ws.onerror = (error) => {
};

ws.onclose = () => {

};

async function sha256Hex(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

//Complicated stuff here, docs reign supreme

function getCanvasFingerprint() {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");

    if (!ctx) return; //Idk why typescript thinks ctx could be null but oh well 

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "1a2b3c";
    ctx.font = "16px Arial";
    ctx.textBaseline = "top";
    ctx.fillText("VotingFingerprint - ", 10, 10);
    ctx.fillText("SpeedInCaseYouCareL 0", 10, 30);

    const grad = ctx.createLinearGradient(0,0,300,0);
    grad.addColorStop(0, "#123456");
    grad.addColorStop(1, "#654321");
    ctx.fillStyle = grad;
    ctx.fillRect(10,50,280,20);

    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height).data;

    const step = 50;
    let samples = [];
    for (let i=0;i<imgData.length;i+=step) {
        samples.push(imgData[i]);
    }
    return samples.join(",");
}

function getWebGLInfo() {
    const canvas = document.createElement("canvas");
    let gl: WebGLRenderingContext | null = null;
    try {
        gl = canvas.getContext("webgl") as WebGLRenderingContext || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
    } catch (e) {
        gl = null;
    }
    if (!gl) {
        return {render: "none", maxTextureSize: "none"};
    };


    let renderer = "none";
    try {
        const dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbgRenderInfo) {
            renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || "none";
        }
    } catch (e) {
        renderer = "error"; //Shame
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    return {renderer, maxTextureSize: String(maxTextureSize)};
}

async function buildFingerprintString() {
    const canvasPart = getCanvasFingerprint();
    const webgl = getWebGLInfo();
    const parts = [
        "canvas:" + canvasPart,
        "webgl_renderer:" + webgl.renderer,
        "maxTexture:" + webgl.maxTextureSize,
        "userAgent:" + navigator.userAgent.replace(/\s+/g, " "), //Might remove
        "timezone:" + Intl.DateTimeFormat().resolvedOptions().timeZone
    ];
    return parts.join("|")
}

async function requestFingerprint(consent: boolean) {
    if (!consent) {
        console.log("welp");
        return;
    }
    const fingerprintString = await buildFingerprintString();
    const clientHash = await sha256Hex(fingerprintString);

    return clientHash

    //Other stuff if I need it
}

document.addEventListener("DOMContentLoaded", async () => {
    const fingerprint = await requestFingerprint(true)
    if (!fingerprint) return;
    fingerprintText.innerText = fingerprint;
})