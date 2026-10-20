English | [简体中文](./README.zh-CN.md)

# MagnetSniffer

![MagnetSniffer Icon](./icons/icon-48.svg)
> A Firefox Manifest V3 WebExtension for detecting BT hash and magnet links on web pages.

## Overview

MagnetSniffer automatically scans web content, identifies standalone 40-character BT SHA1 hashes and full magnet links.
Matched hash strings will be highlighted in **yellow background**, converted into clickable magnet links directly on the page.

## Features

- Detect full `magnet:?xt=urn:btih:` links
- Recognize raw 40-length BT SHA1 hash (common in Japanese introduction pages)
- Yellow highlight matched hash / magnet text
- Convert raw hash into clickable magnet links automatically
- Lightweight, skips scripts, styles, textareas and existing links for better performance

## How to Use

### Development

```bash
# Install dependencies
npm install

# Launch Firefox with temporary extension loaded
npm run start
```
