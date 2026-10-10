# 编排 + 内置重试（Orchestrator + Retry）实战精讲
## —— `ColissimoDocumentPipeline::run()` 手写串联 4 个 Service，并自带 `while + maxAttempts`

> **核心结论**：仓库**不引 Laravel Pipeline**，但 `ColissimoDocumentPipeline` 看上去像、实际不是。它是一个**手动串联** 4 个 Service 的"迷你编排器"，并且内置重试。教学上，这份代码正好对比 **Pipeline 模式 vs 手写编排**。

---

## 1. "Pipeline" 的双重含义

- **GoF 解释器 / 管道-过滤器（POSA）**：把数据流过一组处理器，每个处理器可能修改数据、可能短路返回。
- **Laravel `\Illuminate\Pipeline`**：基于闭包的 `->send($payload)->through($pipes)->then($destination)`。

仓库的 `ColissimoDocumentPipeline` 跟两者都**不太一样**：

- **没有 `->through()`** —— 不用管道抽象。
- **没有 `$next($payload)`** —— 不做"洋葱皮"调用栈。
- **有 4 个 Service 一字排开** + `while + maxAttempts` 内置重试。

> **它本质上是"编排器 (Orchestrator) + 流程服务 (Service)"**——只比 Pipeline 少一层"基于闭包的可换"特性，多一份"全静态调用，可读性高"的优势。

---

## 2. 仓库编排器详解

`express/carrier-colissimo/src/V2/ColissimoDocumentPipeline.php`：

```php
final class ColissimoDocumentPipeline
{
    public function __construct(
        private readonly OrderDocumentRulePort $rulePort,
        private readonly ResolveDocumentJobService $resolveService,
        private readonly UploadDocumentService $uploadService,
        private readonly PersistUploadedDocumentService $persistService,
        private readonly LoggerPort $logger,
        private readonly int $maxAttempts = 3,
    ) {}

    public function run(ShipmentSource $source, array $extra = []): ?DocumentUploadResult
    {
        // 1) 规则判定（短路）
        if (! $this->rulePort->matches($source)) {
            $this->logger->info('colissimo', 'document skipped by rule');
            return null;
        }

        // 2) 解析作业
        $job = $this->resolveService->resolve($source, $extra);
        if ($job === null) {
            $this->logger->info('colissimo', 'no document to upload');
            return null;
        }

        // 3) 上传 + 重试
        $attempt = 1;
        $result  = $this->uploadService->upload($job);
        while (! $result->success && $attempt < $this->maxAttempts) {
            $attempt++;
            $result = $this->uploadService->upload($job->withAttempt($attempt));
            $this->logger->warning('colissimo', "retry {$attempt}/{$this->maxAttempts}");
        }

        // 4) 持久化
        if ($result->success) {
            $this->persistService->remember(
                $job->platformOrderNumber,
                $job->packageReference,
                $result->documentId,
            );
            $this->logger->info('colissimo', 'document persisted', [
                'doc_id' => $result->documentId,
            ]);
            return $result;
        }

        $this->logger->error('colissimo', 'document upload failed after retries');
        return null;
    }
}
```

### 2.1 结构示意

```
ShipmentSource ─► rulePort.matches? ─┐
                                     │ false → log info, return null
                                     ▼ true
                          resolveService.resolve()
                                     │ null → log info, return null
                                     ▼ Job
                          uploadService.upload()  ◄────┐
                                     │ false             │
                                     ▼                   │ retry until success
                                     │ while + maxAttempts │
                                     │                   │
                                     ▼ success         ─┘
                          persistService.remember()
                                     │
                                     ▼
                                DocumentUploadResult
```

### 2.2 重试是"内嵌"而不是"装饰"

```php
while (! $result->success && $attempt < $this->maxAttempts) {
    $attempt++;
    $result = $this->uploadService->upload($job->withAttempt($attempt));
}
```

> 重试语义是 **"上传 + 上传 + 上传"**，原因：**这一类重试跟业务流程强绑定**（要换 trace context、要换 audit 标识、要换 attempt 计数）。如果用 Laravel Pipeline + 装饰器，重试会变成"上传 + 装饰包装 + 上传 + 装饰包装"，**业务上下文丢失**。

---

## 3. 与 Laravel Pipeline 的取舍

| 维度 | Laravel Pipeline | 仓库手写编排 |
|---|---|---|
| 加一个新步骤 | `->through([..., new Step])` 即可 | 改 `Pipeline` 构造/方法 |
| 步骤可换 | 是（闭包/对象均可） | 否（构造注入时定死） |
| 调用栈深 | `$next($payload)` | 单层调用 |
| 重试 / 短路逻辑 | 写在每个 pipe 内 | **集中在 run() 里**，可视化 |
| 单元测试 | mock pipe 接口 | mock 4 个 Service 接口 |
| 可调试性 | 栈帧深，要进每个 pipe | **一目了然** |
| 与业务语境契合度 | 中（管道语义普遍） | 高（按用例语言命名） |

> **教学判断**：本仓库的编排器**不引 Pipeline 因为"够用即停"**。当你的步骤数 >= 5、且每步都希望独立被复用时，引 Pipeline 才有优势。

---

## 4. 串行编排的常见陷阱

- **顺序敏感却把顺序写进 Service 内部**：每个 Service 自带"上次调用我做了什么" → 编排器失语。
- **重试语义和短路口太多**：每个 Service 又可以决定是否中断；编排器失去流程控制权。

> 仓库编排器把这一切集中在 `run()` 里，是有意的"**编排器即剧本**"。

---

## 5. 反模式（仓库外的常见踩坑）

1. **编排器里嵌业务**：在 `run()` 里做"如果失败就调业务系统"——编排器只该负责 Service 调度，不写业务。
2. **重试写在 Service 里**：让每个 Service 自己重试，结果整个链路重试嵌套重试 → 雪崩。
3. **编排器退化为事件总线**：把"步骤完成就发事件"塞进编排器，下次排查问题要追踪 12 个订阅者。

---

## 6. 30 秒最小复刻（"上传 + 异步通知" 编排器）

```php
final class DocumentUploadOrchestrator
{
    public function __construct(
        private Rule $rule,
        private Resolver $resolver,
        private Uploader $uploader,
        private Notifier $notifier,
        private Logger $logger,
        private int $maxAttempts = 3,
    ) {}

    public function run(Envelope $env): ?Receipt
    {
        if (! $this->rule->matches($env)) return null;

        $job = $this->resolver->resolve($env);
        if (! $job) return null;

        $attempt = 0;
        $result  = $this->uploader->upload($job);
        while (! $result->ok && $attempt < $this->maxAttempts) {
            $attempt++;
            $result = $this->uploader->upload($job->withAttempt($attempt));
        }

        if (! $result->ok) {
            $this->logger->error('upload failed');
            return null;
        }

        $this->notifier->success($env->userId, $result->id);
        return new Receipt($result->id);
    }
}
```

> 这就是 `ColissimoDocumentPipeline` 的同款心法：**步骤少时手写胜过引框架**。

---

## 7. 小结

- 编排器本质是"剧情调度"，Service 是"角色"，Logger 是"旁白"。
- 重试嵌在编排器而不是装饰层，因为**重试是流程属性、不是横切属性**。
- 仓库拒绝引 Pipeline 是有意的克制，**当步骤数增加或需要插件式扩展时再升 Pipeline**。

---

## 写在最后：模式之间的关系

仓库里这十个模式不是"全都用上"的题海，而是**根据业务复杂度挑选**。把它们做成一张总览：

```
[Decorator]                                              ← 仅在切面增强时用
    ↓ 实现接口
[Port + Adapter]    ← 接口隔离外部世界（核心稳定层）
    ↓
[Strategy + Registry]  ← 按 code 选人
    ↓
[Orchestrator / Template Method]   ← 编排 + 重试 + 步骤延迟
    ↓
[Schema 校验 / Fitness Function]   ← 架构约束 + 契约护城河
```

**最值得带走的判断**：**当业务复杂度上升，先扩 Port，再加适配器，最后才用装饰器**。装饰器是最克制、最末端的一把刀。
