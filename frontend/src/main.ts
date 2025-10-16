const fingerprintText = document.getElementById("fingerprint") as HTMLParagraphElement;
const hashDecode = document.getElementById("hash") as HTMLParagraphElement;
const hasDecoded = document.getElementById("hasHashDecoded") as HTMLParagraphElement;
const serverHash = document.getElementById("fullHash") as HTMLParagraphElement;

const form = document.getElementById("le-form") as HTMLFormElement;

let part: string | undefined = undefined
let myHash: string | undefined = undefined
let fingerprint: string | undefined = undefined

async function sha256Hex(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

//Complicated stuff here, docs reign supreme
//Vibin~
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
}

async function checkHashThusFar() {
    const response = await fetch('http://localhost:3001/api/checkDecoded', {
        method: "POST"
    });

    if (!response.ok) {
        console.log("error");
        return;
    }

    const data = await response.json();

    return data
}

async function uploadFingerprint(hash: string) {
    let returnHash = undefined;
    let completed_hash = undefined
    const response = await fetch('http://localhost:3001/api/hash', {
        method: "POST",
        headers: {
            "Content-Type" : "application/json",
        },
        body: JSON.stringify({
            hash: hash,
        })
    });

    if (!response.ok) {
        console.log("Server error prolly");
        return;
    }
    const data = await response.json();
    if (data.success !== true) {
        console.log("Something went wrong.");
    }
    returnHash = data.hash;
    completed_hash = data.completed_hash
    console.log(completed_hash)
    return [returnHash, completed_hash];
}

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    let formData = new FormData(form);

    const response = await fetch('http://localhost:3001/api/submitDecrypted', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            decrypt: formData.get("hashArea"),
            myHash: myHash,
            fingerprint: fingerprint
        })
    })

    form.reset()

    if (!response.ok) {
        console.log("error with form submit");
        return;
    }

    const data = await response.json();

    console.log(data);

    if (data.success === true || data.success === 'true') {
        window.location.reload()
    }
})

document.addEventListener("DOMContentLoaded", async () => {
    fingerprint = await requestFingerprint(true)
    if (!fingerprint || !hasDecoded || !hashDecode || !serverHash) return;
    const hashThusFar = await checkHashThusFar()
    let haveIDecoed = false;
    const uploadResult = await uploadFingerprint(fingerprint)
    if (!uploadResult || hashThusFar === undefined) return
    myHash = uploadResult[0]
    haveIDecoed = uploadResult[1]
    fingerprintText.innerText = fingerprint;
    hashDecode.innerText = myHash || "";
    serverHash.innerText = hashThusFar.hashThusFar.toString().replaceAll(",", "")
    hasDecoded.innerText = haveIDecoed ? "yes" : "no";

})