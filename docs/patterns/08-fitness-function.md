# 架构守护测试（Architectural Fitness Function）实战精讲
## —— `gz168/Carrier/tests/ModuleIsolationTest` 把"不要 use 上游"变成 CI 红条

> **核心结论**：Fitness Function 是 Neal Ford 在《Building Evolutionary Architectures》里提出的概念：本仓库的 `ModuleIsolationTest` 是最干净的微型示范 —— **架构约束不是写进文档，而是写进断言**。

---

## 1. 经典出处

- **Fitness Function**（Ford、Himura、Parsons）：用可执行测试**度量**一个架构属性的健康程度。
- **Architectural Test / Architecture-as-code**：同类概念，常见名 `archtest` / `architecture-test`。
- **Module Test**（JDepend、Degraph、PHPArch 等工具）是工业化的实现。

仓库没引外部工具，**手写一个 30 行的测试** —— 这反而更适合教学：你会看到每一行的意图。

---

## 2. 仓库里的示范：`ModuleIsolationTest`

```php
final class ModuleIsolationTest extends TestCase
{
    private const DISALLOWED = ['Ups\\', 'Carrier\\', 'Order\\']; // 'Carrier\\' 是包自己，跳过

    public function test_does_not_depend_on_other_modules(): void
    {
        foreach (self::DISALLOWED as $namespace) {
            if (str_starts_with($namespace, 'Carrier\\')) continue;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(__DIR__ . '/../src'),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($iterator as $entry) {
                if (! $entry->isFile() || $entry->getExtension() !== 'php') continue;
                $contents = (string) file_get_contents($entry->getPathname());
                $this->assertStringNotContainsString(
                    'use ' . $namespace,
                    $contents,
                    "Module isolation violated at: {$entry->getPathname()}",
                );
            }
        }
    }
}
```

> **这就是六边形架构的"反向依赖规则"自动掉到 CI 里**。一旦有人 `use Order\`、`use Ups\Carrier\` 或 `use Carrier\` 在 src/ 之外（注意 `Carrier\\` 是包自己的命名空间，被代码跳过了），**红条即来**。

### 2.1 为什么"反向"很重要

| 方向 | 含义 | 健康度 |
|---|---|---|
| `Carrier -> Order` | Carrier 知道 Order 私货 | ❌ 退化为耦合 |
| `Carrier -> Ups\\` | Carrier 知道 UPS 私货 | ❌ 退化为耦合 |
| `Order -> Carrier` | Order 调到 Carrier 接口 | ✅ 健康 |
| `Ups\\ -> Carrier` | UPS 实现 Carrier 的接口 | ✅ 健康 |

> **健康方向里"调用方"指向抽象层（Carrier），"实现方"也指向抽象层（Carrier 实现 Port）**。Carrier 这个抽象层站在中间，**不引用任何具象层**。`ModuleIsolationTest` 就是这个反向规则的"自动红条"。

---

## 3. 把架构规则变成"红条"的常用手法

| 规则 | 实现示例 |
|---|---|
| "这个包不能 use 那个包" | `assertStringNotContainsString('use Order\\', ...)` |
| "领域层不能 use 框架" | 扫 `src/Domain` 不能含 `'use Illuminate\\'` |
| "API 入口不能直接读写 DB" | 扫 `routes/` 下不能含 `DB::` |
| "测试覆盖某层 ≥ 80%" | PHPUnit `@covers` + `coverage` 校验 |
| "类的循环依赖" | 用 `tanerdiler/awesome-cypress` 或 `deptrac` |
| "每个 Service 只能注入自己的 Port" | 扫构造参数是否在白名单 |
| "日志只能通过 LoggerPort" | 扫 `src/` 不能含 `'Log::info('` |

仓库手写的就是**第一行**，但已经教了核心：

- 列出禁止 namespace。
- 在 `src/` 遍历每个 PHP 文件。
- `assertStringNotContainsString` 兜底断言 + 错误信息含文件名。

---

## 4. 反模式（仓库外的常见踩坑）

1. **写了红条，但不进 CI**。许多团队"测试写了，但只在本地跑" → 第一次合 master 时架构已经被破坏。
2. **红条太严苛**：禁止一切 `use Foo\\`，结果连 `use PHPUnit\\Framework\\TestCase;` 都被拦。仓库写法是"namespace 前缀 + 文件名 skip"的过滤。
3. **红条不报错**：测试通过了但 CI 没显示红条，让人怀疑——必须把红条当作"PR 合并门槛"。
4. **过度依赖工具**：用 `deptrac` 等需要配置文件，结果新人不知道怎么改 → 仓库**手写**，每个意图都在 PHPUnit 文本里可见。

---

## 5. 30 秒最小复刻（"领域层不能用 Laravel Facade"）

```php
final class NoIlluminateInDomainTest extends \PHPUnit\Framework\TestCase
{
    public function test_domain_does_not_use_laravel_facades(): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(__DIR__ . '/../src/Domain'),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );
        foreach ($iterator as $f) {
            if ($f->getExtension() !== 'php') continue;
            $contents = (string) $f->openFile();
            $this->assertStringNotContainsString(
                'use Illuminate\\',
                $contents,
                "Domain code must not depend on Laravel: {$f->getPathname()}"
            );
        }
    }
}
```

> 这就是仓库 `ModuleIsolationTest` 的同款心法：**两条规则（一行代码） + 一个遍历 + 一个红条**。

---

## 6. 进阶：把规则做成"即时反馈"

- **Pre-commit 钩子**：`pre-commit` 跑 `phpunit tests/architecture`，任何架构红线在 commit 之前就触发。
- **CI gate**：`architecture-tests` stage 失败时阻止 PR 合并。
- **PR 评论机器人**：自动把红条以 PR 评论形式写出来（比 CI 红条更易看见）。
- **IDE 插件**：`phpstan-rules` 写"禁止 use X" 的规则，工程反馈即时。

---

## 7. 小结

- **Fitness Function**：架构原则的可执行度量。
- **仓库的写法的精髓**：少即是多 —— 一个 30 行测试守住了"Carrier 不引用任何上层 / 具体承运商"的关键边界。
- 进 CI / 进 PR gate / 进 IDE 反馈，三档都能加。

> 上一篇：[`07-hexagonal.md`](./07-hexagonal.md)｜下一篇：[`09-specification.md`](./09-specification.md)
