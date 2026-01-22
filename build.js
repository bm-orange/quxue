/**
 * 趣学项目构建脚本
 * 将 src 目录构建到 build 目录，供 Netlify 部署
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const BUILD_DIR = path.join(__dirname, 'build');

// 从HTML内容中提取标题
function extractTitle(htmlContent) {
  const match = htmlContent.match(/<title>([^<]+)<\/title>/);
  return match ? match[1].trim() : '未命名页面';
}

// 扫描src目录下的所有HTML文件
function scanHtmlFiles(dir, baseDir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanHtmlFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.html')) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const title = extractTitle(content);
      // 排除 index.html 自身
      if (entry.name !== 'index.html') {
        files.push({
          url: relativePath,
          title: title
        });
      }
    }
  }

  return files;
}

// 复制目录的函数
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`源目录不存在: ${src}`);
    process.exit(1);
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`创建目录: ${dest}`);
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name !== 'index.html') {
      // index.html 特殊处理
      fs.copyFileSync(srcPath, destPath);
      console.log(`复制: ${entry.name}`);
    }
  }
}

// 生成页面索引并注入到 index.html
function buildIndex(pages) {
  const indexPath = path.join(SRC_DIR, 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf-8');

  // 生成 JSON 数据
  const pageDataJson = JSON.stringify(pages.map(p => ({
    url: p.url,
    title: p.title.replace(/^[🎒📚✏️🎯]+?\s*/, '').trim(), // 移除emoji前缀
    desc: '点击开始练习'
  })));

  // 注入页面数据
  indexContent = indexContent.replace('{{PAGE_DATA}}', pageDataJson);

  // 生成页面列表 HTML
  const pageListHtml = pages.map(page => {
    const cleanTitle = page.title.replace(/^[🎒📚✏️🎯]+?\s*/, '');
    return `            <a href="${page.url}" class="page-card block bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-xl font-semibold text-gray-800 mb-2">${page.title}</h2>
                <p class="text-gray-500 text-sm">点击开始练习</p>
            </a>`;
  }).join('\n');

  indexContent = indexContent.replace('{{PAGE_LIST}}', pageListHtml);

  // 写入 build 目录
  const buildIndexPath = path.join(BUILD_DIR, 'index.html');
  fs.writeFileSync(buildIndexPath, indexContent);
  console.log(`生成: index.html (包含 ${pages.length} 个页面索引)`);
}

// 清空目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    console.log(`清空目录: ${dir}`);
  }
}

// 主构建流程
function build() {
  console.log('开始构建...\n');

  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    console.log(`创建build目录: ${BUILD_DIR}`);
  }

  // 清空并重新构建 build 目录
  cleanDir(BUILD_DIR);

  // 扫描页面
  const pages = scanHtmlFiles(SRC_DIR, SRC_DIR);
  console.log(`扫描到 ${pages.length} 个页面`);

  // 生成 index.html
  buildIndex(pages);

  // 复制其他文件
  copyDir(SRC_DIR, BUILD_DIR);

  console.log('\n构建完成!');
  console.log(`输出目录: ${BUILD_DIR}`);
  console.log('\n页面索引:');
  pages.forEach(p => console.log(`  - ${p.title} -> ${p.url}`));
}

build();
