const magnetReg = /\b(magnet:\?xt=urn:btih:)?[a-fA-F0-9]{40}\b/g;
let magnetList = [];

function replaceMagnetText(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent;
    magnetReg.lastIndex = 0;
    let match;
    let hasMatch = false;
    while ((match = magnetReg.exec(text)) !== null) {
        hasMatch = true;
    }
    if (!hasMatch) return;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    magnetReg.lastIndex = 0;

    while ((match = magnetReg.exec(text)) !== null) {
        if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        let raw = match[0];
        if (!raw.startsWith("magnet:")) {
            raw = `magnet:?xt=urn:btih:${raw}`;
        }
        if (!magnetList.includes(raw)) magnetList.push(raw);

        const a = document.createElement("a");
        a.href = raw;
        a.textContent = match[0];
        a.style.background = "#ffdd00"; // 亮黄色底色，黑色文字，清晰醒目
        a.style.color = "#000";
        a.style.padding = "0 3px";
        a.style.borderRadius = "3px";
        a.style.textDecoration = "underline";
        frag.appendChild(a);
        lastIdx = magnetReg.lastIndex;
    }
    if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    node.parentNode.replaceChild(frag, node);
}

function walkDom(root) {
    const childNodes = Array.from(root.childNodes);
    for (const n of childNodes) {
        if (["SCRIPT", "STYLE", "A"].includes(n.tagName)) continue;
        if (n.nodeType === Node.TEXT_NODE) {
            replaceMagnetText(n);
        } else {
            walkDom(n);
        }
    }
}

walkDom(document.body);
setTimeout(() => walkDom(document.body), 800);

const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
        for (const n of mut.addedNodes) {
            if (n.nodeType === Node.ELEMENT_NODE) walkDom(n);
        }
    }
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getMagnetList") {
        const unique = [...new Set(magnetList)]
        sendResponse({ list: unique })
    }
})
