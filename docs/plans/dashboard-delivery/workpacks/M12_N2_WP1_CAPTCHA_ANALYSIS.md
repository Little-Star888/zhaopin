# M12-N2-WP1：智联招聘验证码与反爬机制分析

> 版本：1.0 | 日期：2026-03-26 | 角色：反爬虫研究工程师
> 状态：已完成
> 前置输入：M11-N1 调研报告
> 输出：验证码机制分析 + 反爬深度分析 + Chrome Extension 绕过方案

---

## 重要勘误

在 M11-N1 调研报告中，将 `__zp_stoken__` 归属为智联招聘的反爬 Cookie，经本轮深入调研确认：

- **`__zp_stoken__` 是 BOSS 直聘（zhipin.com）的核心反爬 Cookie**，与智联招聘无关
- 智联招聘和 BOSS 直聘是两家独立的公司，互为竞争对手，不共用反爬技术栈
- 两者唯一的关联是 BOSS 直聘创始人赵鹏曾任智联招聘 CEO（人员渊源，非股权关联）
- 智联招聘的实际反爬机制以 `x-anit-forge-code/token` 请求头 + 动态 Cookie + AES 数据加密为核心

---

## 目录

- [1. 验证码类型](#1-验证码类型)
- [2. 反爬机制深度分析](#2-反爬机制深度分析)
- [3. Chrome Extension 绕过方案](#3-chrome-extension-绕过方案)
- [4. 结论与建议](#4-结论与建议)

---

## 1. 验证码类型

### 1.1 滑块验证码

| 属性 | 详情 |
|------|------|
| **类型** | 拖动式滑块（Slider） |
| **触发场景** | 登录环节、高频请求触发、异常 IP 访问 |
| **服务商** | 疑似自研或极验（GeeTest）—— 未找到明确的服务商标识文档 |
| **触发频率** | 中等 — 正常使用偶发，高频采集（每秒多次请求）必触发 |
| **处理难度** | 中等 — 可通过 Selenium 模拟拖动 + 轨迹模拟解决 |

**技术特征**：
- 需要拖动滑块完成拼图匹配
- 检测鼠标轨迹的行为特征（加速度、抖动等）
- 检测 WebDriver/Selenium 自动化特征（`navigator.webdriver`）

**Chrome Extension 环境处理**：
- 在真实浏览器环境中触发概率较低（用户本身就在浏览器中操作）
- 即使触发，可引导用户手动完成
- 无需自动化破解验证码

### 1.2 图片验证码

| 属性 | 详情 |
|------|------|
| **类型** | 字符识别型 / 图片选择型 |
| **触发场景** | 风控系统二次验证 |
| **触发频率** | 较低 — 通常在滑块验证失败后降级触发 |
| **处理难度** | 中等 — OCR 识别或打码平台可解决 |

### 1.3 点选验证码

| 属性 | 详情 |
|------|------|
| **类型** | 按照提示点击图片中的指定文字/元素 |
| **触发场景** | 特定风控场景触发 |
| **触发频率** | 低 — 正常浏览几乎不会遇到 |
| **处理难度** | 中-高 — 需要目标检测 + 语义理解 |

### 1.4 验证码触发条件总结

| 触发条件 | 验证码类型 | 概率 |
|----------|-----------|------|
| 用户首次登录 | 滑块验证码 | 高 |
| 单 IP 短时间高频请求（>30次/分钟） | 滑块验证码 | 高 |
| 异常 User-Agent / 无 Cookie 请求 | 滑块验证码 | 中 |
| 滑块验证失败 | 图片验证码 / 点选验证码 | 中 |
| 同一账号多 IP 切换 | 滑块验证码 | 中 |
| 长时间无操作后突然大量请求 | 滑块验证码 | 低-中 |
| 正常浏览（3-5秒/次） | 无验证码 | 低 |

---

## 2. 反爬机制深度分析

### 2.1 动态 Cookie 机制

智联招聘的 Cookie 不是静态的，而是通过前端 JavaScript 动态生成，每次刷新页面都可能变化。

#### 2.1.1 核心机制：`setCookie` 函数

智联招聘的反爬核心围绕一个 `setCookie` 函数展开，结合了 **JS 混淆 + eval 加密** 技术：

```
页面加载 → 执行混淆 JS → setCookie 动态计算 → 写入 Cookie
                                        ↓
                              包含指纹信息 + 时间戳 + 随机因子
```

#### 2.1.2 Cookie 中的反爬字段

| Cookie 字段 | 用途 | 生成方式 |
|-------------|------|----------|
| 动态 Cookie（setCookie 生成） | 核心反爬验证 | JS 混淆加密计算 |
| `JSESSIONID` | 会话标识 | 服务端下发 |
| `sensorsdata2015jssdkcross` | 埋点追踪 | 前端 SDK 生成 |
| `zt` / 其他指纹字段 | 浏览器指纹 | 前端采集计算 |

#### 2.1.3 生命周期

| 属性 | 详情 |
|------|------|
| **有效期** | Session 级别，关闭浏览器后失效 |
| **更新频率** | 每次页面刷新/导航都可能重新生成 |
| **与 Session 绑定** | Cookie 与当前会话强绑定，更换 Cookie 需要重新验证 |
| **双重限制** | 时效限制（Session 过期） + 次数限制（频繁请求可能提前失效） |

### 2.2 `x-anit-forge-code/token` 请求头

这是智联招聘 API 请求的核心反爬参数。

#### 2.2.1 参数说明

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| `x-anit-forge-code` | 反伪造验证码 | 首次搜索时从页面 HTML 中的嵌入 JSON 获取（`submitCode`） |
| `x-anit-forge-token` | 反伪造 Token | 同上（`submitToken`） |

#### 2.2.2 获取流程

```
1. 用户登录 → 获取登录态 Cookie
2. 首次点击搜索 → 页面加载搜索结果
3. 解析页面 HTML 中的 <script id="__NEXT_DATA__"> 标签
4. 提取 JSON 中的 submitCode 和 submitToken
5. 分别赋值给 x-anit-forge-code 和 x-anit-forge-token
```

#### 2.2.3 关键依赖

- 必须携带有效的 `JSESSIONID`（需登录后的值）
- `JSESSIONID` 未经验证时，获取到的 `submitCode` 和 `submitToken` 可能为空
- 这两个参数在登录后的场景下实际测试中可以省略（非强制）

#### 2.2.4 注意事项

- M11-N1 报告中提到的 `__zp_stoken__` 实际属于 BOSS 直聘，不属于智联招聘
- 智联招聘使用的是 `x-anit-forge-code/token` 而非 `__zp_stoken__`
- 搜索中反复出现的 CSDN 文章标题虽然包含"智联招聘"字样，但实际分析的是拉勾网（lagou.com）的参数，需注意甄别

### 2.3 请求频率限制

#### 2.3.1 频率阈值（社区经验，可能动态调整）

| 场景 | 建议间隔 | 触发风险 |
|------|----------|----------|
| 正常浏览 | 3-5 秒/次 | 低 |
| 适度采集 | 5-8 秒/次 | 低-中 |
| 高频采集 | <1 秒/次 | 高（必触发验证码或封禁） |
| 单 IP 每小时 | 控制在 30-50 次以内 | 中 |
| 并发城市数 | 1-2 个 | 中（多城市并发易触发） |

#### 2.3.2 限制维度

- **单 IP 频率**：超过阈值直接拉黑
- **单账号频率**：同一账号高频访问触发验证码
- **账号关联**：同 IP 多账号操作会被关联识别
- **User-Agent 检测**：非浏览器特征直接拒绝

### 2.4 IP 策略

| 策略 | 详情 |
|------|------|
| **封禁类型** | 临时封禁（非永久） |
| **封禁时长** | 约 24-48 小时（社区经验） |
| **封禁表现** | 触发验证码 → 强制登录 → 拒绝服务 |
| **解封方式** | 等待自然过期 / 更换 IP / 登录账号 |
| **IP 关联** | 同 IP 多账号会被关联识别 |

### 2.5 浏览器指纹检测

智联招聘可能采用以下浏览器指纹检测手段（基于招聘类网站通用反爬实践推断，未找到智联招聘专用的指纹检测分析文档）：

| 检测维度 | 检测内容 | 绕过难度 |
|----------|----------|----------|
| `navigator.webdriver` | 检测是否为自动化浏览器 | 低 |
| `navigator.plugins` | 检测浏览器插件列表 | 低 |
| `navigator.languages` | 检测语言设置 | 低 |
| Canvas 指纹 | 通过 Canvas 渲染生成唯一指纹 | 中 |
| WebGL 指纹 | 检测渲染器和厂商字符串 | 中 |
| WebRTC 泄露 | 检测真实 IP 地址 | 低-中 |

> **注意**：以上为招聘类网站通用检测手段的推断，智联招聘的具体实现可能有所不同。在 Chrome Extension 环境中，用户使用的是真实浏览器，以上指纹检测基本不会触发。

### 2.6 数据加密

智联招聘的 API 请求和响应数据使用了 AES 加密：

| 维度 | 详情 |
|------|------|
| **请求加密** | POST 请求数据通过 AES-CBC 加密 |
| **响应加密** | 返回的职位信息通过 AES 解密 |
| **AES IV** | 固定值（如 `c558Gq0YQK2QUlMc`） |
| **AES Key** | 32 位随机字符串，通过 RSA 公钥加密后提交服务端激活 |

> **注意**：数据加密机制的分析主要来自 CSDN 上针对拉勾网的逆向文章。智联招聘是否也使用相同的加密方式，需要实际抓包验证。在 Chrome Extension 环境中，如果通过 Content Script 拦截页面 JS 渲染后的 DOM 数据，可以绕过加密层。

---

## 3. Chrome Extension 绕过方案

### 3.1 方案 A：Content Script 页面 JS 拦截（推荐）

**原理**：在用户正常浏览智联招聘时，通过 Content Script Hook 原生 `XMLHttpRequest` 和 `fetch`，拦截页面发出的 API 请求及其携带的反爬参数。

**实现架构**：

```
用户浏览器 → 访问 sou.zhaopin.com
                    ↓
         Content Script 注入页面
                    ↓
         Hook XMLHttpRequest / fetch
                    ↓
         拦截 fe-api.zhaopin.com 请求
                    ↓
         提取 Cookie + x-anit-forge-* 参数
                    ↓
         保存到 chrome.storage
                    ↓
         Background Script 发起 XHR 请求时读取使用
```

**核心代码逻辑**：

```javascript
// content.js - Hook 拦截
(function() {
  // Hook XMLHttpRequest
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (['x-anit-forge-code', 'x-anit-forge-token'].includes(name)) {
      chrome.runtime.sendMessage({
        type: 'captured-header',
        name, value,
        url: this._url
      });
    }
    return originalSetHeader.apply(this, arguments);
  };

  // Hook document.cookie 捕获动态 Cookie
  const cookieDesc = Object.getOwnPropertyDescriptor(document, 'cookie') ||
                     Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cookieDesc && cookieDesc.set) {
    const originalSet = cookieDesc.set;
    Object.defineProperty(document, 'cookie', {
      ...cookieDesc,
      set: function(val) {
        chrome.runtime.sendMessage({ type: 'cookie-set', value: val });
        return originalSet.call(this, val);
      }
    });
  }
})();
```

**优势**：
- 在真实浏览器环境中运行，所有 JS 都由页面原生执行
- 反爬参数由页面自己生成，无需逆向
- 指纹检测不会触发（用户使用真实浏览器）
- 验证码由用户手动完成，无自动化检测风险

**劣势**：
- 需要用户先访问一次智联招聘页面才能获取参数
- 参数有时效性，过期后需要重新获取
- 无法离线批量采集

### 3.2 方案 B：Background Script 网络请求拦截

**原理**：使用 `chrome.webRequest.onBeforeSendHeaders` 在请求发出前读取请求头，提取反爬参数。

**实现架构**：

```
页面发起请求 → chrome.webRequest 拦截
                    ↓
         onBeforeSendHeaders 监听
                    ↓
         读取请求头中的 Cookie 和 x-anit-forge-*
                    ↓
         存储到 chrome.storage.local
```

**核心代码逻辑**：

```javascript
// background.js
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    if (details.url.includes('fe-api.zhaopin.com')) {
      for (let header of details.requestHeaders) {
        if (header.name === 'x-anit-forge-code' ||
            header.name === 'x-anit-forge-token') {
          // 提取并存储
          chrome.storage.local.set({
            ['zhaopin_' + header.name]: header.value,
            zhaopin_timestamp: Date.now()
          });
        }
      }
    }
  },
  { urls: ["*://fe-api.zhaopin.com/*"] },
  ["requestHeaders", "extraHeaders"]
);
```

**优势**：
- 可以捕获所有对 API 的请求，包括用户翻页时的新请求
- 参数自动更新（每次翻页都会生成新参数）
- 不需要修改页面 DOM

**劣势**：
- Manifest V3 中 `webRequestBlocking` 已移除，无法修改请求
- 仅能读取参数，无法主动构造请求
- 需要配合 `extraHeaders` 权限才能读取 Cookie 头

### 3.3 方案 C：Cookie 同步 + 直接 API 调用

**原理**：通过 `chrome.cookies` API 获取智联招聘的完整 Cookie，然后直接向 `fe-api.zhaopin.com` 发起 XHR 请求。

**实现架构**：

```
用户登录智联招聘 → chrome.cookies 获取完整 Cookie
                          ↓
              Background Script 构造 API 请求
                          ↓
              携带 Cookie + x-anit-forge-* 请求头
                          ↓
              获取 JSON 响应 → 解析数据
```

**核心代码逻辑**：

```javascript
// background.js - 获取 Cookie
async function getZhaopinCookies() {
  return new Promise(resolve => {
    chrome.cookies.getAll({ domain: '.zhaopin.com' }, cookies => {
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      resolve(cookieStr);
    });
  });
}

// 构造 API 请求
async function fetchZhaopinJobs(city, keyword, page) {
  const cookies = await getZhaopinCookies();
  const { x_anit_forge_code, x_anit_forge_token } =
    await chrome.storage.local.get(['zhaopin_x-anit-forge-code',
                                     'zhaopin_x-anit-forge-token']);

  const url = `https://fe-api.zhaopin.com/c/i/sou?jl=${city}&kw=${keyword}&p=${page}`;
  const response = await fetch(url, {
    headers: {
      'Cookie': cookies,
      'x-anit-forge-code': x_anit_forge_code || '',
      'x-anit-forge-token': x_anit_forge_token || '',
      'User-Agent': navigator.userAgent
    }
  });
  return response.json();
}
```

**优势**：
- 可以在后台静默获取数据，无需用户停留在搜索页
- 采集效率高，可批量请求
- 实现简单，代码量少

**劣势**：
- `x-anit-forge-code/token` 需要从方案 A 或 B 中获取
- Cookie 有时效性，过期后需要重新登录
- 频率控制需要自行实现
- 如果 API 响应数据加密，还需要解密逻辑

### 3.4 推荐组合方案

**方案 A（拦截） + 方案 C（API 调用）组合使用**：

```
┌─────────────────────────────────────────────────┐
│  第一阶段：参数采集（用户正常浏览时自动完成）       │
│                                                   │
│  Content Script Hook → 拦截 x-anit-forge-*      │
│  chrome.cookies API → 获取完整 Cookie            │
│  chrome.storage → 持久化存储参数                  │
└───────────────────────┬─────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  第二阶段：数据采集（后台静默执行）                │
│                                                   │
│  Background Script → 读取存储的参数               │
│  构造 fetch 请求 → 携带完整参数                   │
│  解析 JSON 响应 → 存储到 IndexedDB               │
│  频率控制 → 3-8秒/请求，随机抖动                 │
└─────────────────────────────────────────────────┘
```

### 3.5 验证码处理策略

在 Chrome Extension 环境中，验证码的处理策略如下：

| 策略 | 说明 |
|------|------|
| **预防为主** | 控制请求频率（3-8秒/次），避免触发验证码 |
| **用户手动处理** | 触发验证码时暂停采集，提示用户手动完成 |
| **状态检测** | 通过检测 API 响应状态码判断是否触发验证码 |
| **自动降速** | 检测到异常响应时自动降低请求频率 |
| **Cookie 过期提醒** | Cookie 失效时提示用户重新登录 |

---

## 4. 结论与建议

### 4.1 难度重新评估

| 维度 | M11-N1 评估 | 本轮调研修正 | 说明 |
|------|------------|-------------|------|
| `__zp_stoken__` | 归属智联招聘 | **归属 BOSS 直聘** | 勘误：智联招聘不使用此参数 |
| `x-anit-forge-*` | 中高难度 | **中等难度** | 可通过浏览器环境拦截获取 |
| 验证码 | 中等 | **低（Extension 环境）** | 真实浏览器环境触发概率极低 |
| 数据加密 | 未提及 | **可能存在 AES 加密** | 需实际抓包验证 |
| **总体难度** | 中等 | **中等偏低（Extension 环境）** | 浏览器环境大幅降低反爬门槛 |

### 4.2 Chrome Extension 方案可行性

| 评估项 | 结论 |
|--------|------|
| **技术可行性** | **可行** — 浏览器环境天然绕过 JS 加密和指纹检测 |
| **开发复杂度** | 中等 — 需要 Content Script + Background Script + Cookie 管理 |
| **稳定性** | 中等 — 参数有时效性，需要定期刷新 |
| **用户体验** | 良好 — 用户只需正常浏览，采集在后台自动完成 |
| **维护成本** | 中等 — 智联反爬策略可能更新，需要跟进适配 |

### 4.3 风险点

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| Cookie 过期导致采集失败 | 中 | 设计 Cookie 过期检测 + 用户提醒机制 |
| 反爬策略升级 | 中 | 预留参数监控和告警模块 |
| DOM/API 结构变化 | 低 | 使用 try-catch + 版本兼容层 |
| 请求频率触发封禁 | 中 | 严格的频率控制 + 自动降速 |
| API 响应数据加密 | 中 | 优先使用 DOM 解析作为备选方案 |

### 4.4 关键结论

1. **智联招聘在 Chrome Extension 环境中的反爬门槛较低**：由于用户使用真实浏览器，JS 加密、指纹检测等反爬手段自然失效。

2. **核心需要解决的是参数获取和 Cookie 管理**：通过 Content Script 拦截 `x-anit-forge-*` 参数，通过 `chrome.cookies` API 管理 Cookie，可以实现稳定采集。

3. **验证码不是主要障碍**：在正常使用频率下（3-8秒/请求），验证码触发概率极低。即使触发，可引导用户手动完成。

4. **建议与 51job 使用相同的 DOM 解析方案作为备选**：如果 API 方式因加密等原因不稳定，可直接解析搜索页 DOM（与 51job 方案类似），降低维护成本。

5. **M11-N1 报告中的 `__zp_stoken__` 描述需要修正**：该参数属于 BOSS 直聘，不属于智联招聘。智联招聘使用的是 `x-anit-forge-code/token` 请求头体系。

---

## 参考资源

| 资源 | 链接 | 说明 |
|------|------|------|
| X-S-HEADER 等参数分析（拉勾网 JS 逆向） | [CSDN](https://blog.csdn.net/kdl_csdn/article/details/123542236) | 注意：实际分析的是拉勾网，非智联招聘，但技术方案有参考价值 |
| BOSS 直聘 `__zp_stoken__` 逆向 | [52pojie](https://www.52pojie.cn/thread-2058603-1-1.html) | 确认 `__zp_stoken__` 属于 BOSS 直聘 |
| 掘金：某招聘网站 `_zp_stoken_` 逆向 | [掘金](https://juejin.cn/post/7123017466296893476) | JS Hook 定位 Cookie 生成过程 |
| JS 混淆/eval 加密/字体加密反爬技术 | [知乎](https://zhuanlan.zhihu.com/p/361766826) | 以智联招聘为案例讲解 setCookie 机制 |
| 智联招聘 Cookie 动态变化讨论 | [SegmentFault](https://segmentfault.com/q/1010000045089266) | 实际问题讨论 |
| Chrome Extension 请求拦截方案 | [掘金](https://juejin.cn/post/7168443487380045854) | `chrome.devtools.network` 拦截方法 |
| 利用浏览器插件绕过登录验证码 | [掘金](https://juejin.cn/post/6844904058705149965) | Chrome 插件 Cookie 管理方案 |
| GeeTest 滑块验证码攻防演进 | [掘金](https://juejin.cn/post/7585206549285290025) | 验证码技术演进分析 |
| 代理 IP 高效获取招聘数据指南 | [CSDN](https://blog.csdn.net/CodeTribe/article/details/148049068) | IP 频率限制经验 |
| Scrapy + Selenium 爬取智联招聘 | [编程技术笔记](https://yxchangingself.xyz/posts/scrapy-selenium-zhilian-zhaopin-spider/) | Selenium + Cookie 登录方案 |
