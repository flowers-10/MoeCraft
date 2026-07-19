# MoeCraft 手办多商家商城实施 Harness

> 文档状态：规划基线（待执行）
> 适用仓库：`pnpm` + Turborepo Monorepo
> 三个交付面：`apps/storefront`（消费者前台）、`apps/admin`（商家/平台后台）、`apps/api`（业务 API）
> 共享契约：`packages/shared`

## 1. 目标、边界与最小规模

MoeCraft 的目标不是单店展示站，而是一个允许商家申请入驻、平台审核与治理、消费者购买手办及周边的多商家交易平台。最小可上线版本必须完成“商家入驻 → 商品审核上架 → 用户浏览下单 → 支付 → 商家履约 → 售后 → 平台结算”的闭环。

### 1.1 最少需要多少模块

按可独立验收的业务边界计算，建议最少 **18 个核心模块**，另有 **8 个生产级横切能力**。若删减支付、库存、售后、权限、结算中的任意一项，只能称为演示原型，不能称为可运营商城。

| # | 核心模块 | 最小可上线能力 | 主要交付面 |
|---|---|---|---|
| 1 | 身份认证与账号 | 注册、登录、退出、刷新会话、找回密码、封禁 | 三端 |
| 2 | 用户与地址 | 个人资料、收货地址、偏好、注销申请 | 前台/API |
| 3 | 商家入驻与店铺 | 申请、资质、审核、店铺资料、启停 | 后台/API |
| 4 | RBAC 权限 | 平台/商家隔离、角色、权限、数据域 | 后台/API |
| 5 | 类目/品牌/IP | 多级类目、品牌、作品/IP、角色、属性模板 | 三端 |
| 6 | SPU/SKU 商品 | 商品资料、规格、图片、状态、审核、上下架 | 三端 |
| 7 | 定价与促销 | 售价、划线价、优惠券、活动价、使用规则 | 三端 |
| 8 | 库存 | 可售/锁定/扣减/释放、库存流水、预警 | 后台/API |
| 9 | 搜索与发现 | 搜索、筛选、排序、推荐位、无结果状态 | 前台/API |
| 10 | 购物车 | SKU 加购、改量、失效校验、按店铺分组 | 前台/API |
| 11 | 结算台 | 地址、运费、优惠、金额试算、库存复核 | 前台/API |
| 12 | 订单 | 创建、拆单、状态机、取消、超时、详情 | 三端 |
| 13 | 支付 | 支付单、回调验签、幂等、退款、对账基础 | 前台/API |
| 14 | 履约物流 | 发货、包裹、物流单号、收货、超时完成 | 三端 |
| 15 | 售后 | 退款/退货申请、审核、退货物流、退款状态 | 三端 |
| 16 | 评价与收藏 | 收藏、评分、评价、图片、审核/隐藏 | 三端 |
| 17 | 平台佣金与结算 | 佣金快照、商家账单、结算状态、导出 | 后台/API |
| 18 | 运营与内容 | Banner、公告、专题、首页楼层、协议 | 三端 |

生产级横切能力：i18n 与本地化、审计日志、通知中心、安全与风控、可观测性、数据备份与恢复、隐私合规、发布与运维。

### 1.2 MVP 明确不做

- 首发不做直播、拍卖、社区论坛、分销裂变、会员付费、积分商城、复杂满减引擎、跨境报关、多仓调拨、智能推荐模型。
- 首发可只接一个真实支付渠道和一个物流查询渠道，但接口必须抽象，必须提供本地沙箱适配器。
- 首发支持 `zh-CN` 与 `en-US`；架构需允许添加 `ja-JP`，但不要求首发翻译完成。
- 不保存银行卡信息；支付敏感数据交由合规支付服务商托管。

## 2. 三个工程拆分与职责

### 2.1 `apps/storefront`：消费者商城（Nuxt 3，端口 3000）

负责 SEO 友好的公开页面及登录后的购买体验：主页、搜索、类目、商品详情、店铺主页、购物车、结算、支付结果、订单、售后、评价、收藏、账户、地址、通知、协议与多语言切换。

- 使用 Nuxt 页面、布局、middleware、composable 与 server-friendly 数据获取约定。
- 公共商品页优先 SSR/ISR；账户、购物车、结算等私有页面禁止被搜索引擎索引。
- UI 不直接拼接金额、日期、状态文案；统一通过本地化格式化器和共享枚举映射。
- API 请求集中封装，带请求 ID、认证刷新、错误归一化与取消机制。
- 购物车服务端为事实来源；未登录本地购物车在登录后可合并。

### 2.2 `apps/admin`：商家与平台统一后台（Vue 3 + Vite，端口 3001）

同一应用承载两种工作台，但菜单、路由、操作与数据必须按租户和权限隔离。

- 商家端：入驻进度、店铺、商品、库存、订单、发货、售后、优惠券、评价、数据、账单、成员。
- 平台端：商家审核、类目品牌、商品审核、订单监察、售后仲裁、内容运营、用户治理、结算、权限、审计、系统配置。
- 路由级与按钮级权限仅改善体验；最终授权必须由 API 执行。
- 列表统一支持分页、筛选、排序、空态、错误态、加载态、批量操作与导出任务。
- 危险操作使用二次确认，展示影响范围，服务端记录操作者和变更前后值。

### 2.3 `apps/api`：NestJS 业务 API（端口 3002）

负责所有可信业务规则、认证授权、数据持久化、支付/物流集成与异步任务。

- 模块按领域拆分：`auth`、`users`、`merchants`、`catalog`、`products`、`inventory`、`promotions`、`cart`、`checkout`、`orders`、`payments`、`fulfillment`、`after-sales`、`reviews`、`settlements`、`content`、`notifications`、`audit`。
- 控制器只处理协议与 DTO；业务规则放 service/domain；数据库访问通过 repository 或明确的 Prisma service 边界。
- 所有外部输入启用 DTO 校验、白名单和转换；错误返回稳定 `code`，文案由客户端本地化。
- 金额使用最小货币单位整数（如人民币分）并携带 ISO 4217 币种；禁止浮点金额运算。
- 时间数据库统一 UTC，API 使用 ISO 8601，展示端按用户时区格式化。
- 订单、支付、库存、退款使用事务、唯一约束、幂等键和状态迁移保护。
- `/health` 保持轻量；另设 readiness 检查数据库/队列，不向匿名用户泄露内部信息。

### 2.4 `packages/shared`：跨端契约

存放两个及以上应用共用的领域类型、DTO 形状、状态枚举、错误码、权限常量、分页契约和纯函数。不得放 Nest/Vue/Nuxt 运行时依赖，也不得包含密钥或环境配置。

## 3. 总体架构约束

### 3.1 推荐数据模型

核心实体至少包括：

`User`、`Credential`、`Session`、`Address`、`MerchantApplication`、`Merchant`、`Store`、`StaffMembership`、`Role`、`Permission`、`Category`、`Brand`、`Franchise`、`Character`、`Product`、`ProductTranslation`、`Sku`、`ProductMedia`、`Inventory`、`InventoryLedger`、`Price`、`Promotion`、`Coupon`、`Cart`、`CartItem`、`Order`、`MerchantOrder`、`OrderItem`、`Payment`、`Refund`、`Shipment`、`AfterSale`、`Review`、`Favorite`、`Settlement`、`SettlementItem`、`ContentBlock`、`Notification`、`AuditLog`、`IdempotencyKey`。

关键建模规则：

- 一个消费者订单可按商家拆成多个 `MerchantOrder`；支付单可覆盖总单，退款落到订单项/商家子单。
- `OrderItem` 保存商品名、规格、图片、单价、税费/优惠等快照，历史订单不依赖当前商品数据。
- 库存变化只能经库存服务写流水；可售量 = 物理量 - 锁定量，禁止页面直接改库存字段。
- 商品以 SPU 表达款式，以 SKU 表达可购买规格；手办预售需保存预计发售/补款/发货窗口。
- 多语言内容使用稳定主记录 + 翻译表或 JSON 翻译字段；可检索字段建议独立翻译表。
- 所有商家业务表带 `merchantId`，查询默认注入数据域，防止越权读取。
- 软删除只用于确有审计价值的数据；订单、支付、库存流水、审计日志不可物理删除。

### 3.2 API 契约

- 前缀 `/api/v1`；REST 资源命名一致，分页统一 `page/pageSize`，响应统一 `items/meta`。
- 错误示例：`{ code, message, details?, requestId }`；`code` 稳定，`message` 不作为程序判断依据。
- 写操作接受 `Idempotency-Key`；支付回调、创建订单、退款、发货尤其必须幂等。
- 列表 API 对最大 `pageSize`、可排序字段和筛选字段设白名单。
- 上传使用短期签名或服务端代理，校验 MIME、扩展名、大小、数量，并做病毒/恶意内容处理预留。
- 生成 OpenAPI；前端类型优先从契约或共享 DTO 获得，禁止三端各写一套状态字符串。

### 3.3 i18n、本地化与无障碍

- 首发 locale：`zh-CN`（默认）、`en-US`；路由策略确定为默认语言无前缀、其他语言带前缀，或全部带前缀，选定后不得混用。
- 语言优先级：用户账户偏好 → cookie → `Accept-Language` → 默认语言；切换后持久化。
- 前后台均建立 `locales/{locale}` 命名空间：`common`、`auth`、`catalog`、`cart`、`order`、`payment`、`merchant`、`validation`、`errors`。
- 商品/类目/品牌等业务内容有独立翻译和回退规则；缺少翻译时回退 `zh-CN` 并在后台提示，不显示原始 key。
- 金额用 `Intl.NumberFormat`，日期用 `Intl.DateTimeFormat`；复数、占位符、性别等使用 i18n 能力，不拼接句子。
- SEO 页面输出对应 `lang`、`hreflang`、本地化 title/description、canonical；站点地图覆盖语言版本。
- 所有表单有 label、错误关联与键盘操作；图片有 alt；对比度满足 WCAG 2.1 AA 的主要要求。

### 3.4 安全、隐私与合规

- 密码使用强哈希；访问令牌短时有效，刷新令牌轮换并可撤销；浏览器优先 HttpOnly、Secure、SameSite cookie 方案。
- 登录、注册、找回密码、优惠券领取、下单、支付回调、上传均限流；后台敏感账号支持 MFA 预留。
- RBAC + 商家数据域双重校验，覆盖 IDOR、批量接口、导出与文件访问。
- 防护 XSS、CSRF、SQL 注入、SSRF、恶意上传；配置 CSP、CORS、Helmet 和安全响应头。
- 日志脱敏密码、token、证件号、手机号、邮箱、地址、支付数据；密钥只从环境/密钥服务读取。
- 提供隐私政策、用户协议、商家协议、Cookie 说明；支持数据导出、注销申请和法定留存策略。
- 商家资质属于敏感数据，限制访问、加密存储、签名 URL 下载并记录审计。

### 3.5 可观测性与运维

- 每个请求生成/透传 `requestId`，结构化日志包含服务、环境、用户/商家匿名标识、耗时和结果。
- 指标至少覆盖错误率、P95 延迟、登录失败、下单成功率、支付成功率、库存锁定失败、回调积压。
- 异步任务用于订单超时关闭、库存释放、通知、导出、结算；支持重试、退避、死信与人工重放。
- 数据库迁移向前兼容，生产发布采用 expand/migrate/contract，发布前备份并定期演练恢复。
- 环境至少分 local/staging/production；禁止 staging 与 production 共用数据库、对象存储或支付密钥。

## 4. 分阶段模块待办与 Git 提交计划

执行原则：以下每个 `Gxx` 是一次建议的原子 Git 提交，不要求机械凑数；一个提交必须可构建、可审阅、可回滚。不要把 schema、全部 API 和全部 UI 堆入一次提交。提交格式使用 Conventional Commits。

### Phase 0：基线修复与工程门禁（G01–G04）

#### G01 `chore(repo): establish runnable monorepo baseline`

- [x] 记录 Node 20+、pnpm 10+；补充根 README 的启动、构建、环境配置说明。
- [x] 核对依赖声明：移除尚未成套实现的 Prisma/认证悬空接线，保留轻量健康检查基线。
- [x] 核对中文源文件编码与语法；确认仓库内容为 UTF-8，PowerShell 旧版读取造成的终端乱码不改写源码。
- [x] 验收：使用 Node 20.20.2 执行全仓 `typecheck` 与 `build` 均通过，并实际请求 `/health` 成功。

#### G02 `chore(config): validate environment configuration`

- [x] 为三端建立类型化环境变量入口和 `.env.example`；示例值使用明确占位符。
- [x] API 启动时校验数据库、JWT、端口和 CORS；对象存储接入时再增加对应必填项。
- [x] 客户端仅暴露 API Base URL，数据库与 JWT 密钥只存在于 API 服务端配置。

#### G03 `feat(shared): define domain primitives and api contract`

- [x] 建立品牌化 ID、Money、Currency、Locale、分页、排序、错误响应、日期字符串等共享类型。
- [x] 建立商家申请、商品、订单、支付、售后的状态枚举及订单允许迁移表。
- [x] 建立角色、权限和稳定错误码常量，禁止消费者散落字符串。

#### G04 `chore(api): add database migration and seed workflow`

- [x] 固定 MySQL 与 Prisma 6，提交初始 schema 和可重复迁移，禁止提交本地数据库。
- [x] 幂等 seed 创建演示管理员、商家、类目、商品、SKU 与库存；管理员密码强制从环境变量读取。
- [x] 文档化 generate、migrate、deploy 和 seed 命令；不提供容易误用的自动 reset 命令。

### Phase 1：平台基础能力（G05–G10）

#### G05 `feat(api): implement authentication and sessions`

- [x] 实现注册、登录、退出、刷新、当前用户、忘记/重置密码接口。
- [x] 登录失败返回统一错误，刷新令牌只存哈希并在使用时轮换，退出/重置密码撤销会话；设备列表留待账户模块。
- [x] 添加 DTO 白名单验证、最低密码强度、认证接口限流和安全审计事件。

#### G06 `feat(frontends): add auth flows and route guards`

- [x] storefront：注册、登录、会话恢复、账户路由保护与退出流程；找回密码页面随通知投递接入补充。
- [x] admin：后台登录、角色准入校验和未认证界面隔离，平台/商家角色均可进入对应工作台骨架。
- [x] 覆盖未登录与过期访问令牌清理；禁用账号由 API 拒绝，多标签页同步将在统一客户端单元完善。

#### G07 `feat(platform): establish i18n and locale persistence`

- [x] storefront 与 admin 建立类型化中英词典、持久化 locale 和运行时切换基础。
- [x] API 认证错误使用稳定错误码；邮件/通知模板在对应模块接入时按 locale 渲染。
- [x] 共享 Locale、Money 与 Intl 格式化入口已确定；未来词典随模块增加并保持类型一致。

#### G08 `feat(api): implement rbac and merchant data scope`

- [x] 共享契约预置五类角色，JWT principal 与 API 角色要求使用同一类型。
- [x] 全局 AuthorizationGuard 执行服务端授权，商家数据域断言默认拒绝跨商家访问。
- [x] 平台管理员可跨域；角色分配端点后续只能授予具备 system/manage 权限的主体。

#### G09 `feat(frontends): add typed api clients and error handling`

- [x] 两前端统一 base URL、认证头、刷新并发锁、超时/取消和错误归一化。
- [x] 客户端只暴露稳定错误对象，现有表单使用安全错误文案；全局错误页随应用壳完善。
- [x] 每次请求传递 locale、timezone 与 requestId，不向界面暴露服务端堆栈。

#### G10 `feat(api): add audit log and file service foundation`

- [x] 建立不可修改的审计日志模型与受 `audit:read` 保护的只读分页查询；当前覆盖认证事件，后续模块写入各自事件。
- [x] 文件服务支持用途、所有者、MIME 白名单、大小上限、私有对象键和隔离状态；签名对象存储适配器后续接入。
- [x] 平台管理员可通过只读 API 检索审计，普通商家与消费者无权访问或修改。

### Phase 2：商家入驻、目录与商品（G11–G17）

#### G11 `feat(merchant): implement merchant onboarding`

- [x] API：申请草稿、提交、补件、通过、拒绝、撤回状态机；保存审核意见与时间线。
- [x] admin 商家视角：分步表单、资质上传、协议确认、进度查看。
- [x] admin 平台视角：审核队列、资料查看、拒绝原因模板、启用/停用。
- [x] 限制重复申请；资质文件私有；审核全程记录审计。

#### G12 `feat(merchant): implement store profile and staff`

- [x] 店铺名、slug、logo、banner、介绍、客服信息、退货地址、营业状态。
- [x] 店主直接创建员工账号并分配初始密码，不再依赖用户注册后的邀请/接受流程。
- [x] 店主按员工配置后台可见路由与按钮权限；登录成功且进入后台前由服务端返回访问配置，前端据此生成导航并执行路由守卫。
- [x] 路由与按钮权限同时由 API Guard 强制校验；员工权限编辑和账号停用保持店主专属，店主权限固定且不可移除。
- [x] storefront 店铺主页仅展示审核通过且营业中的店铺。

#### G13 `feat(catalog): implement categories brands and franchises`

- [x] 平台维护多级类目、品牌、作品/IP、角色、标签、属性模板和中英翻译。
- [x] 防止类目循环；被商品引用的数据禁用而非直接删除。
- [x] storefront 输出可索引的类目/品牌/IP 聚合页。

#### G14 `feat(product): implement product drafts and sku variants`

- [x] 商家创建商品草稿：多语言标题/描述、类目、品牌/IP/角色、材质、比例、厂商、版权信息。
- [x] SKU 支持规格组合、商家编码、条码、重量尺寸、价格和初始库存。
- [x] 图片排序、封面、alt、视频预留；保存草稿不要求满足上架全部字段。

#### G15 `feat(product): add product review and publishing workflow`

- [x] 状态：草稿 → 待审核 → 已通过/已拒绝 → 在售/下架/归档。
- [x] 修改关键字段后重新审核；平台可给字段级意见；商家可复制商品。
- [x] API 阻止未审核、店铺停用或无库存 SKU 对外销售。

#### G16 `feat(inventory): implement stock ledger and reservations`

- [ ] 库存调整必须填写原因，创建不可变流水；设置低库存阈值。
- [ ] 下单锁定、支付扣减、取消/超时释放；操作用版本号或条件更新防超卖。
- [ ] 后台显示可售、锁定、总量及流水，不允许负库存。

#### G17 `feat(storefront): deliver catalog browsing and product detail`

- [ ] 首页楼层、类目页、搜索页、店铺页、商品详情页、SKU 选择和库存状态。
- [ ] 筛选类目/品牌/IP/价格/现货或预售；排序相关度、新品、价格、销量。
- [ ] 商品页包含预售说明、发货窗口、正版/版权字段、店铺信息、售后摘要。
- [ ] 完成 skeleton、空态、错误态、移动端与 SEO metadata/结构化数据。

### Phase 3：交易最小闭环（G18–G25）

#### G18 `feat(cart): implement persistent multi-merchant cart`

- [ ] 加购、改量、删除、选中、失效项、按店铺分组；服务端实时校验 SKU 与限购。
- [ ] 登录时合并游客购物车，冲突采用明确规则并告知用户。
- [ ] 购物车展示当前价，但声明最终价格以结算试算为准。

#### G19 `feat(user): implement profile and address book`

- [ ] 资料、头像、语言/时区偏好、地址增删改查与默认地址。
- [ ] 地址按国家/地区动态字段建模，手机号与邮编校验可配置。
- [ ] 支持账号注销申请；高风险信息变更要求重新认证。
- [ ] 完成 storefront 登录后闭环：登录成功优先返回经过校验的原目标页，否则进入账户概览；禁止外部 URL 重定向，已登录用户访问登录/注册页时返回合理业务页。
- [ ] 首页与全站 Header 根据会话动态切换登录/注册和用户头像菜单；菜单至少提供账户概览、订单、地址、收藏、通知与安全设置入口，并支持明确的退出反馈。
- [ ] 建立 `/account` 账户中心父布局和概览、资料、地址、安全等嵌套路由；订单、收藏、通知子路由分别由 G24/G30 接入，未完成前不得展示不可用的假入口。
- [ ] 首次 SSR、客户端 hydration、刷新和直接访问私有深层链接时先完成会话恢复再渲染权限页面，提供加载态，避免登录闪烁、重复请求和首次点击路由失效。
- [ ] 刷新令牌失效、账号禁用或 API 返回 401 时只执行一次会话清理并安全返回登录页；保留站内原目标地址，登录后可继续原流程。
- [ ] 登录、退出及会话失效在多标签页同步；用户资料或语言偏好更新后 Header 和当前页面立即响应，不要求整页刷新。
- [ ] 验收覆盖：游客首页、正常登录、带站内 redirect 登录、刷新账户深层路由、过期会话、退出、浏览器前进后退、多标签页退出及移动端账户菜单。

#### G20 `feat(promotion): implement coupon and simple pricing rules`

- [ ] 首发仅做固定减免/百分比、最低金额、有效期、适用店铺/商品、总量/每人限领。
- [ ] 结算时服务端重新计算；订单保存原价、优惠分摊和规则快照。
- [ ] 后台支持创建、暂停、查看领取与使用统计；已使用记录不可删除。

#### G21 `feat(checkout): implement quote and order preview`

- [ ] 结算试算返回按店铺分组的商品、运费、优惠、应付金额与失效原因。
- [ ] 提交前复核地址、价格、库存、限购、店铺状态、优惠券。
- [ ] 客户端传值不得作为最终金额；quote 有短期有效期和签名/版本。

#### G22 `feat(order): implement atomic order creation and state machine`

- [ ] 原子创建总单、商家子单、订单项快照、库存锁和支付意图。
- [ ] 状态至少：待支付、已支付/待发货、部分发货、已发货、已完成、已取消、售后中、已关闭。
- [ ] 创建使用幂等键；订单号不可猜测；买家/商家/平台数据域隔离。

#### G23 `feat(payment): add provider abstraction and sandbox payment`

- [ ] 定义 create/query/close/refund/verifyWebhook 接口，先实现可控沙箱适配器。
- [ ] 回调验签、原始事件留档、金额/币种核对、重复回调幂等、乱序处理。
- [ ] 前台提供支付中、成功、失败、取消和轮询恢复；刷新页面不重复支付。

#### G24 `feat(order-ui): deliver buyer and merchant order workflows`

- [ ] storefront：订单列表/详情、继续支付、取消、确认收货、售后入口。
- [ ] admin 商家：订单筛选、详情、买家隐私最小展示、备注、导出异步任务。
- [ ] admin 平台：跨店监察、异常筛选；普通运营无权修改支付事实。

#### G25 `feat(jobs): automate payment timeout and inventory release`

- [ ] 队列任务关闭超时未支付订单、关闭支付单并释放库存。
- [ ] 任务幂等，可重试且有死信；管理后台可查看失败任务但重放需高权限。
- [ ] 对下单到支付全链路增加指标和告警。

### Phase 4：履约、售后与信任（G26–G31）

#### G26 `feat(shipping): implement shipment and fulfillment`

- [ ] 商家发货前复核订单状态；支持一个子单多个包裹和部分发货。
- [ ] 物流公司、单号、发货时间、轨迹查询适配器；手工补录需审计。
- [ ] 买家查看物流并确认收货；自动确认策略可配置。

#### G27 `feat(after-sales): implement refund and return workflow`

- [ ] 按订单项申请仅退款/退货退款，填写原因、金额、凭证。
- [ ] 商家同意/拒绝，买家填写退货物流，收货后触发退款；平台可仲裁。
- [ ] 售后与订单/支付状态联动，退款总额不得超过可退金额。

#### G28 `feat(payment): implement refunds and reconciliation records`

- [ ] 退款请求幂等，记录渠道退款号、状态、失败原因和回调。
- [ ] 每日基础对账导入/拉取，标记金额、状态和缺单差异，不自动静默改账。
- [ ] 人工处理差异必须双重确认与审计。

#### G29 `feat(review): implement verified-purchase reviews`

- [ ] 完成订单才可评价，限制每订单项一次；支持评分、文本、图片和追加评价预留。
- [ ] 商家回复；平台按规则隐藏违规内容但保留审计记录。
- [ ] 商品聚合评分异步更新，避免每次实时全表计算。

#### G30 `feat(customer): add favorites and notifications`

- [ ] 收藏商品/店铺；失效商品保留状态提示。
- [ ] 站内信覆盖审核、订单、支付、发货、售后、结算；已读状态按用户保存。
- [ ] 邮件/SMS/推送经 provider 抽象，用户可配置非交易通知偏好。

#### G31 `feat(risk): add operational safety controls`

- [ ] 登录与交易异常规则、IP/账号速率限制、重复下单与优惠滥用标记。
- [ ] 平台可冻结商家销售或结算，但操作不能篡改历史订单。
- [ ] 建立举报/申诉最小记录和处理时间线。

### Phase 5：结算、运营与数据（G32–G36）

#### G32 `feat(settlement): implement commission and merchant statements`

- [ ] 下单时保存佣金规则快照；完成且过售后窗口后进入可结算。
- [ ] 账单列出订单、退款、平台佣金、调整项、应结金额和币种。
- [ ] 状态：生成、待确认、可支付、已支付、争议；禁止直接编辑合计。

#### G33 `feat(settlement-ui): deliver finance workbenches`

- [ ] 商家查看账单明细、导出、提出异议；敏感账户信息掩码。
- [ ] 平台审核调整项、标记付款并上传凭证；付款角色与审核角色可分离。
- [ ] 财务导出带水印、权限和下载过期时间。

#### G34 `feat(content): implement localized cms slots`

- [ ] Banner、公告、专题、首页楼层、协议版本，支持 locale、定时发布、预览和回滚。
- [ ] 内容链接使用白名单，富文本消毒；预览不污染线上缓存。
- [ ] 前台在 CMS 不可用时有安全默认布局。

#### G35 `feat(analytics): add privacy-aware operational dashboards`

- [ ] 指标口径文档化：GMV、实付、退款、净收入、订单转化、客单价、在售 SKU、缺货率。
- [ ] 商家只能看本店，平台看全局；时区、币种、退款归属日期明确。
- [ ] 仪表盘异步聚合，不在主交易库执行无限制重查询。

#### G36 `feat(admin): complete platform configuration and governance`

- [ ] 配置支付/物流开关、订单超时、售后窗口、佣金规则、内容安全词等。
- [ ] 配置变更版本化、审计、支持回滚；密钥只显示是否配置，不回显原文。
- [ ] 系统公告与维护模式有开始/结束时间和白名单。

### Phase 6：生产化与上线（G37–G40）

#### G37 `test(core): add minimum critical-flow test harness`

- [ ] 为金额分摊、库存锁定/释放、状态机、佣金与退款可退额添加单元测试。
- [ ] API 集成测试覆盖越权、幂等、重复支付回调、超卖并发、退款上限。
- [ ] 最小 E2E：商家入驻上架、用户下单支付、商家发货、用户退款。
- [ ] 测试只使用隔离数据库和沙箱 provider，不使用生产凭据。

#### G38 `chore(observability): add logs metrics traces and alerts`

- [ ] 结构化日志与脱敏测试；接入错误追踪、指标和关键链路 trace。
- [ ] 配置 SLO/告警：API 可用性、P95、错误率、队列积压、支付回调失败、数据库容量。
- [ ] 编写故障手册：支付回调积压、超卖、队列停摆、对象存储不可用。

#### G39 `chore(release): create staging and deployment pipeline`

- [ ] CI 依次执行格式/静态检查、typecheck、测试、build、迁移兼容检查和依赖漏洞扫描。
- [ ] 构建产物不可变；环境配置外置；部署支持滚动/蓝绿和快速回滚。
- [ ] staging 完整演练迁移、支付/退款沙箱、邮件和对象存储权限。

#### G40 `docs(launch): complete security privacy and launch checklist`

- [ ] 完成威胁建模、权限矩阵审查、依赖与密钥扫描、备份恢复演练。
- [ ] 完成用户协议、隐私政策、商家协议、售后规则和内容/知识产权投诉流程。
- [ ] 完成容量基线、客服 SOP、财务对账 SOP、事故响应通讯录与回滚决策人。
- [ ] 上线后先灰度商家和流量，观察核心指标后再扩大。

## 5. 模块统一 Definition of Done

每个模块只有同时满足下列适用项，才能勾选完成：

- [ ] 业务规则、状态机、权限主体和异常路径已写清。
- [ ] 数据库 schema 与迁移可向前执行；关键唯一约束、索引、外键策略明确。
- [ ] API DTO 有运行时校验；OpenAPI/共享类型同步；错误码稳定。
- [ ] API 做对象级权限与商家数据域校验，不依赖前端隐藏按钮。
- [ ] storefront/admin 均具备加载、空、错误、成功、权限不足和移动端状态。
- [ ] 所有用户可见文案进入 i18n；日期、数字、金额按 locale 与 timezone 格式化。
- [ ] 关键写操作幂等；并发、重试、乱序、超时和回滚路径已考虑。
- [ ] 敏感数据脱敏；操作写审计；日志无 token、密码、完整证件/支付信息。
- [ ] 至少验证正常路径、验证失败、未登录、无权限、跨商家越权和重复提交。
- [ ] 执行受影响包的 `typecheck`/`build`；跨包改动执行根 `pnpm typecheck`。
- [ ] 文档、`.env.example`、seed 和操作说明与实现同步。
- [ ] Git 提交原子、信息明确，不包含 `.env`、数据库、构建产物或无关用户修改。

## 6. 每个模块的前后端任务模板

复制此模板到 Issue/PR，防止遗漏某一交付面：

```md
## [模块名]

### 业务与契约
- [ ] 角色/场景/非目标
- [ ] 状态机与不变量
- [ ] 共享类型、权限、错误码

### API / 数据
- [ ] schema + migration + index
- [ ] DTO validation + OpenAPI
- [ ] service transaction/idempotency/concurrency
- [ ] RBAC + merchant scope + audit
- [ ] unit/integration verification

### Storefront
- [ ] route/page/components/composable
- [ ] loading/empty/error/success/disabled
- [ ] responsive/a11y/SEO where applicable
- [ ] zh-CN/en-US + locale formatting

### Admin
- [ ] merchant view/platform view
- [ ] list/filter/pagination/detail/form
- [ ] route/button permission and confirmation
- [ ] zh-CN/en-US + responsive behavior

### 验收
- [ ] normal and edge cases
- [ ] unauthorized/cross-merchant/retry/idempotency
- [ ] relevant typecheck/build commands
- [ ] docs and environment examples
```

## 7. Git 执行规则

- 分支建议：一个 Phase 一个 `codex/phase-x-*` 或业务分支；大型 Phase 可按模块拆分。
- 每次提交只解决一个可说明的问题；schema + 对应最小 service 可同提交，纯 UI 原型不得假装业务完成。
- 推荐提交顺序：`shared contract` → `schema/migration` → `API` → `storefront/admin` → `tests/docs`。
- 数据库迁移一旦进入共享环境，不修改旧迁移，新增修正迁移。
- 提交前检查 `git diff --check`、`git status --short`，并运行最小验证矩阵。
- PR 描述列明：范围、截图/API 示例、迁移影响、权限影响、i18n、验证命令、风险和回滚方法。
- 若一个 G 项超过约 500–800 行有效改动或包含多个独立状态机，应拆成多个提交，不追求固定 40 次。

## 8. 上线门禁清单

### 功能闭环

- [ ] 新用户能注册、登录、管理地址并注销会话。
- [ ] 新商家能申请，平台能审核，商家能建立店铺并邀请受限成员。
- [ ] 商家能创建 SKU、提交审核、入库、上架；用户只能买可售 SKU。
- [ ] 用户能搜索、加购、结算、支付；重复点击/回调不产生重复订单或扣款。
- [ ] 商家能发货；用户能查看物流、确认收货并申请售后。
- [ ] 退款金额正确、库存处理正确、账单佣金与退款反映正确。

### 质量与安全

- [ ] `zh-CN`/`en-US` 关键流程无裸 key、乱码、溢出和错误金额/日期格式。
- [ ] 375px 手机、平板、常见桌面宽度完成手工检查；键盘可完成关键表单。
- [ ] 顾客、商家员工、商家店主、平台运营、平台管理员权限矩阵全部检查。
- [ ] 跨店铺对象 ID、导出、上传、回调、批量接口完成越权与滥用检查。
- [ ] 压测至少覆盖商品读取、购物车、创建订单和支付回调；容量结果被记录。
- [ ] 备份可恢复，迁移可执行，应用可回滚，队列任务可重试且不会重复副作用。

### 运营准备

- [ ] 首批类目、品牌/IP、商品翻译、Banner、协议与客服信息已录入并复核版权。
- [ ] 支付、退款、物流、邮件/短信、对象存储使用生产配置并经过小额真实演练。
- [ ] 客服有订单/售后 SOP；财务有日对账/结算 SOP；技术有告警和事故 SOP。
- [ ] 明确 RPO/RTO、值班人员、数据保留期、资质到期提醒和商家退出流程。

## 9. 当前仓库基线审计（2026-07-18）

- `apps/storefront` 当前只有基础首页，商品、账户与交易页面均未实现。
- `apps/admin` 当前是静态仪表盘原型，尚未形成商家/平台角色化业务页面。
- `apps/api` 已出现认证和 Prisma 引用，但从当前文件清单看模块/依赖/Schema 不完整，应先执行 G01。
- 部分现有中文源码呈乱码，应统一 UTF-8 并在 G01 修复后再扩展 i18n。
- `packages/shared` 当前只有品牌名和健康检查类型，尚未承担业务契约职责。
- 仓库无测试运行器；关键交易流程开始前按 G37 方案引入最小测试体系，而不是只依赖页面手测。

## 10. 推荐里程碑

| 里程碑 | 包含提交 | 可展示结果 | 是否可真实运营 |
|---|---|---|---|
| M0 工程可用 | G01–G04 | 三应用稳定构建、数据库可迁移 | 否 |
| M1 身份与平台骨架 | G05–G10 | 登录、i18n、权限、审计、上传基础 | 否 |
| M2 商家可上架 | G11–G17 | 入驻审核、店铺、商品、库存、前台浏览 | 否 |
| M3 可购买 MVP | G18–G25 | 购物车、结算、订单、沙箱支付闭环 | 仅封闭测试 |
| M4 可履约 | G26–G31 | 发货、退款、评价、通知与基础风控 | 小规模试运营 |
| M5 可结算运营 | G32–G36 | 商家账单、CMS、数据与平台治理 | 候选上线 |
| M6 生产上线 | G37–G40 | 测试、监控、部署、合规与演练 | 是 |

首个务实目标是 M3，而不是一次性并行铺开全部页面。每完成一个模块，就依据 Definition of Done 验收和提交；任何交易事实以 API 和数据库为准，界面展示不能替代服务端业务规则。
