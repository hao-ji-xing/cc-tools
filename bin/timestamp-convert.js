#!/usr/bin/env node

function showHelp() {
  console.log(`
时间戳转换工具 - 将Linux时间戳转换为可读格式

用法:
  node timestamp-convert.js <时间戳> [选项]
  node timestamp-convert.js <时间戳1> <时间戳2> ... [选项]

参数:
  <时间戳>    Linux时间戳（支持秒级和毫秒级）或 'now'

选项:
  --json      以JSON格式输出结果（批量转换时自动启用）
  --help, -h  显示帮助信息

功能:
  - 自动识别秒级时间戳（10位数字）和毫秒级时间戳（13位数字）
  - 转换为 yyyy/mm/dd hh:mm:ss 格式
  - 显示对应的星期几
  - 支持批量转换多个时间戳

示例:
  node timestamp-convert.js 1672531200                    # 单个秒级时间戳
  node timestamp-convert.js 1672531200000                 # 单个毫秒级时间戳
  node timestamp-convert.js now                           # 当前时间
  node timestamp-convert.js 1672531200 1672617600 now     # 批量转换
  node timestamp-convert.js 1672531200 --json             # JSON格式输出
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    if (args.length === 0) process.exit(1);
    process.exit(0);
  }
  
  const jsonFlag = args.includes('--json');
  const timestamps = args.filter(arg => !arg.startsWith('--'));
  
  return {
    timestamps,
    jsonOutput: jsonFlag || timestamps.length > 1 // 批量转换时自动启用JSON格式
  };
}

function getWeekdayName(dayIndex) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[dayIndex];
}

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const weekday = getWeekdayName(date.getDay());
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds} ${weekday}`;
}

function convertTimestamp(input, silent = false) {
  let timestamp;
  let type = '';
  
  if (input === 'now') {
    timestamp = Date.now();
    type = 'current';
  } else {
    const numInput = parseInt(input, 10);
    if (isNaN(numInput)) {
      throw new Error('输入的时间戳格式不正确');
    }
    
    // 判断是秒级还是毫秒级时间戳
    if (input.length === 10) {
      // 秒级时间戳，转换为毫秒
      timestamp = numInput * 1000;
      type = 'seconds';
      if (!silent) console.log(`检测到秒级时间戳: ${numInput}`);
    } else if (input.length === 13) {
      // 毫秒级时间戳
      timestamp = numInput;
      type = 'milliseconds';
      if (!silent) console.log(`检测到毫秒级时间戳: ${numInput}`);
    } else {
      throw new Error('时间戳长度不正确，请输入10位秒级时间戳或13位毫秒级时间戳');
    }
  }
  
  const date = new Date(timestamp);
  
  // 验证日期是否有效
  if (isNaN(date.getTime())) {
    throw new Error('无效的时间戳');
  }
  
  return { date, type, originalTimestamp: input };
}

function convertBatch(timestamps, jsonOutput) {
  const results = {};
  const errors = {};
  
  for (const input of timestamps) {
    try {
      const { date, type, originalTimestamp } = convertTimestamp(input, jsonOutput);
      const formatted = formatDateTime(date);
      
      results[originalTimestamp] = {
        formatted,
        type,
        timestamp: input === 'now' ? {
          seconds: Math.floor(Date.now() / 1000),
          milliseconds: Date.now()
        } : null
      };
    } catch (error) {
      errors[input] = error.message;
    }
  }
  
  return { results, errors };
}

export async function main() {
  try {
    const { timestamps, jsonOutput } = parseArgs();
    
    if (timestamps.length === 1 && !jsonOutput) {
      // 单个转换，使用原来的输出格式
      const { date, originalTimestamp } = convertTimestamp(timestamps[0]);
      const formatted = formatDateTime(date);
      
      console.log(`转换结果: ${formatted}`);
      
      // 如果是当前时间，也显示时间戳
      if (originalTimestamp === 'now') {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        console.log(`当前秒级时间戳: ${currentTimestamp}`);
        console.log(`当前毫秒级时间戳: ${Date.now()}`);
      }
    } else {
      // 批量转换或JSON输出
      const { results, errors } = convertBatch(timestamps, jsonOutput);
      
      const output = {
        success: Object.keys(results).length,
        failed: Object.keys(errors).length,
        results,
        ...(Object.keys(errors).length > 0 && { errors })
      };
      
      console.log(JSON.stringify(output, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('转换失败:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // 直接运行文件时执行
  // eslint-disable-next-line no-void
  void main();
}