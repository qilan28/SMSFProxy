# SMSF Proxy

基于 Node.js 的 Firefox 短信验证码接码代理平台，提供用户自助接码和管理后台。

## 功能

- **用户端**：注册、登录、充值（卡密）、查看仪表盘、获取短信验证码
- **管理后台**：服务管理、卡密生成、用户管理、订单查询
- **API 代理**：对接 [Firefox 接码平台](http://www.firefox.fun) API，提供统一接口
- **JWT 认证** + 接口限流

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite (better-sqlite3)
- **认证**：JWT + bcryptjs
- **前端**：原生 HTML/CSS/JS

## 快速开始

### 环境要求

- Node.js >= 18

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/smsf-proxy.git
cd smsf-proxy

# 安装依赖
npm install
```

### 配置

复制 `.env` 文件并填写配置：

```bash
# 服务端口
PORT=3000

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Firefox API 配置（从 Firefox 后台 API对接 页面获取）
FIREFOX_API_BASE_URL=http://www.firefox.fun
FIREFOX_API_TOKEN=your-firefox-api-token

# 管理员默认账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

启动后访问：
- 用户端：http://localhost:3000/login
- 管理后台：http://localhost:3000/admin

## 目录结构

```
smsf-proxy/
├── server.js              # 入口文件
├── config/
│   └── database.js        # 数据库初始化
├── controllers/
│   ├── authController.js  # 认证控制器
│   ├── userController.js  # 用户控制器
│   ├── adminController.js # 管理员控制器
│   └── serviceController.js # 服务控制器
├── middleware/
│   └── auth.js            # JWT 认证中间件
├── models/
│   ├── User.js            # 用户模型
│   ├── Service.js         # 服务模型
│   ├── CardKey.js         # 卡密模型
│   └── Order.js           # 订单模型
├── routes/
│   ├── auth.js            # 认证路由
│   ├── user.js            # 用户路由
│   ├── services.js        # 服务路由
│   └── admin.js           # 管理后台路由
├── services/
│   └── firefoxApi.js      # Firefox API 封装
├── frontend/
│   ├── user/              # 用户前端页面
│   └── admin/             # 管理后台页面
├── public/                # 静态资源
├── data/                  # SQLite 数据库文件（自动生成）
└── package.json
```

## API 接口

### 认证
- `POST /api/auth/login` — 用户登录
- `POST /api/auth/register` — 用户注册

### 用户
- `GET /api/user/profile` — 获取用户信息
- `GET /api/user/services` — 获取可用服务列表
- `POST /api/user/orders` — 创建接码订单
- `GET /api/user/orders` — 查询订单列表
- `POST /api/user/recharge` — 卡密充值

### 管理后台
- `GET /api/admin/users` — 用户列表
- `POST /api/admin/cards` — 生成卡密
- `POST /api/admin/services` — 添加服务
- `GET /api/admin/orders` — 订单查询

## 默认管理员

| 用户名 | 密码 |
|--------|------|
| admin  | admin123 |

首次启动自动创建，生产环境请立即修改。

## 注意事项

- `.env` 中的 `JWT_SECRET` 生产环境务必修改为随机字符串
- 需在 [Firefox 接码平台](http://www.firefox.fun) 注册并获取 API Token
- 未收到短信时请主动调用释放接口，否则强制释放前收到短信仍会扣费
- SQLite 数据库文件存储在 `data/` 目录，注意备份

## License

MIT
