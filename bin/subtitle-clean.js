#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { parseSync } from 'subtitle';

function showHelp() {
  console.log(`
字幕清理工具 - 清理WebVTT中的时间轴行与内联时间标签

用法:
  node subtitle-clean.js <vtt文件绝对路径> 

说明:
  - 移除整行时间轴(例如: 00:00:00.160 --> 00:00:02.310 align:start position:0%)
  - 移除行内时间标签(例如: <00:00:34.160>)
  - 在原目录生成 *_clean.txt 文件

示例:
  node subtitle-clean.js /user/zhangyu/downloads/xxx.en.vtt
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    if (args.length === 0) process.exit(1);
    process.exit(0);
  }
  const inputPath = args[0];
  const keepDuplicates = args.includes('--keep-duplicates');
  return { inputPath, keepDuplicates };
}

function validateFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }
}

function cleanSubtitleContent(content, { keepDuplicates }) {
  const nodes = parseSync(content);
  // 仅处理 cue 节点，并将多行文本拆分为独立行
  const lines = nodes
    .filter((node) => node && node.type === 'cue' && node.data && typeof node.data.text === 'string')
    .map((node) => node.data.text)
    .map((text) => text.replace(/<[^<>]+>/g, ''))
    .flatMap((text) => text.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (keepDuplicates) {
    return lines.join('\n');
  }

  // 去除“连续重复行”
  const deduped = [];
  let previous = '';
  for (const current of lines) {
    if (current !== previous) {
      deduped.push(current);
      previous = current;
    }
  }
  return deduped.join('\n');
}

export async function main() {
  try {
    const { inputPath, keepDuplicates } = parseArgs();
    validateFileExists(inputPath);

    const content = fs.readFileSync(inputPath, 'utf8');
    const cleaned = cleanSubtitleContent(content, { keepDuplicates });

    const parsed = path.parse(inputPath);
    const outputPath = path.join(parsed.dir, `${parsed.name}_clean.txt`);

    fs.writeFileSync(outputPath, cleaned, 'utf8');
    console.log(`已写入: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('处理失败:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // 直接运行文件时执行
  // eslint-disable-next-line no-void
  void main();
}


