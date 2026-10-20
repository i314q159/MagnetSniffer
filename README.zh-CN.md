[English](./README.md) | 简体中文

# MagnetSniffer

![MagnetSniffer 图标](./icons/icon-48.svg)
> 一个用于检测网页中 BT 哈希与磁力链接的 Firefox Manifest V3 扩展。

## 简介

MagnetSniffer 会自动扫描网页内容，识别独立的 40 位 BT SHA1 哈希和完整的磁力链接。
匹配到的哈希字符串会以**黄色背景**高亮，并在页面中直接转换为可点击的磁力链接。

## 功能

- 检测完整的 `magnet:?xt=urn:btih:` 链接
- 识别裸露的 40 位 BT SHA1 哈希（常见于日文介绍页）
- 以黄色高亮匹配到的哈希 / 磁力文本
- 自动将裸哈希转换为可点击的磁力链接
- 轻量，跳过 script、style、textarea 与已有链接以提升性能

## 使用方法

### 开发

```bash
# 安装依赖
npm install

# 启动 Firefox 并加载临时扩展
npm run start
```
