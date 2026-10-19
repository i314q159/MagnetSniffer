(() => {
    "use strict";

    // ---- 配置 ----
    const MAX_BATCH = 200;              // 单帧最多处理的节点数，超出顺延到下一帧
    const PROCESS_IN_ANCHOR = false;    // 是否处理 <a> 内的裸哈希（默认跳过，避免嵌套）
    const HIGHLIGHT_CLASS = "magnet-link-ext";
    const SHORT_TEXT = 40;              // 小于该长度的文本节点快速跳过

    // 局部正则工厂，避免共享 lastIndex
    const makeMagnetRe = () =>
        /\b(magnet:\?xt=urn:btih:)?([a-fA-F0-9]{40})\b/gi;

    const processedTextNodes = new WeakSet();
    const processedElements = new WeakSet();

    // ---- 样式注入（CSP 兜底）----
    try {
        const style = document.createElement("style");
        style.textContent = `
            a.${HIGHLIGHT_CLASS} {
                background: #ffdd00;
                color: #000;
                padding: 0 3px;
                border-radius: 3px;
                text-decoration: underline;
                word-break: break-all;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    } catch (e) {
        // 页面 CSP 禁止内联样式时静默失败，链接功能不受影响
    }

    function normalizeMagnet(raw) {
        return raw.startsWith("magnet:") ? raw : `magnet:?xt=urn:btih:${raw}`;
    }

    function shouldSkipElement(el) {
        if (!el) return true;
        const tag = el.tagName;
        return (
            tag === "SCRIPT" ||
            tag === "STYLE" ||
            tag === "NOSCRIPT" ||
            tag === "TEXTAREA" ||
            (!PROCESS_IN_ANCHOR && tag === "A")
        );
    }

    // 把文本节点里的磁力匹配替换为完整格式的可点击 <a>
    function replaceMagnetText(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        if (processedTextNodes.has(node)) return;
        if (!node.parentNode) {
            // 节点已脱离 DOM，标记避免重复尝试
            processedTextNodes.add(node);
            return;
        }

        const text = node.textContent;
        if (!text || text.length < SHORT_TEXT) {
            processedTextNodes.add(node);
            return;
        }

        const re = makeMagnetRe();
        re.lastIndex = 0;
        if (!re.test(text)) {
            processedTextNodes.add(node);
            return;
        }

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;
        re.lastIndex = 0;

        while ((match = re.exec(text)) !== null) {
            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            const full = normalizeMagnet(match[0]);

            const a = document.createElement("a");
            a.href = full;
            a.textContent = full;
            a.className = HIGHLIGHT_CLASS;
            frag.appendChild(a);

            lastIdx = re.lastIndex;
        }

        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        processedTextNodes.add(node);
        // 再次确认仍在 DOM 中（同步执行下理论上不会变，但防御性检查成本极低）
        if (node.parentNode) {
            node.parentNode.replaceChild(frag, node);
        }
    }

    function walkDom(root) {
        if (!root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            replaceMagnetText(root);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (processedElements.has(root)) return;
        if (shouldSkipElement(root)) {
            processedElements.add(root);
            return;
        }

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(n) {
                    if (processedTextNodes.has(n)) return NodeFilter.FILTER_REJECT;
                    const p = n.parentNode;
                    if (!p || shouldSkipElement(p)) return NodeFilter.FILTER_REJECT;
                    if ((n.textContent || "").length < SHORT_TEXT) {
                        processedTextNodes.add(n);
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const toProcess = [];
        let n;
        while ((n = walker.nextNode())) toProcess.push(n);
        for (const tn of toProcess) replaceMagnetText(tn);

        processedElements.add(root);
    }

    // ---- 防抖合批 + 单帧上限 ----
    let pendingNodes = [];
    let pendingSet = new WeakSet();
    let scheduled = false;

    function enqueue(node) {
        if (!node) return;
        if (pendingSet.has(node)) return;
        pendingSet.add(node);
        pendingNodes.push(node);
    }

    function scheduleProcess() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            const batch = pendingNodes.splice(0, MAX_BATCH);
            // 重建 set，避免已处理节点残留
            pendingSet = new WeakSet();
            for (const n of pendingNodes) pendingSet.add(n);

            for (const n of batch) {
                if (!n.isConnected) continue;
                walkDom(n);
            }

            // 还有剩余则继续调度
            if (pendingNodes.length) scheduleProcess();
        });
    }

    // ---- 初始化 ----
    function start() {
        if (!document.body) return;
        walkDom(document.body);

        const observer = new MutationObserver((mutations) => {
            for (const mut of mutations) {
                if (mut.type === "characterData") {
                    const t = mut.target;
                    if (t && t.nodeType === Node.TEXT_NODE) {
                        processedTextNodes.delete(t);
                        enqueue(t);
                    }
                } else if (mut.type === "childList") {
                    for (const n of mut.addedNodes) {
                        if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
                            enqueue(n);
                        }
                    }
                }
            }
            if (pendingNodes.length) scheduleProcess();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    }
})();
