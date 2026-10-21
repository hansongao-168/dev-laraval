# 装饰模式（Decorator Pattern）实战精讲

> 版本：v1.0
> 适用语言：PHP 8.x
> 配套示例：[examples/decorator/](./)

---

## 一、模式定义

装饰模式（Decorator Pattern）是一种**结构型设计模式**，它允许向一个现有对象**动态地添加新的功能**，而不改变其结构。这种模式创建了一个装饰类，用来包装原有的类，并在保持类方法签名完整性的前提下，提供了额外的功能。

**核心思想**：通过**组合**而非**继承**来扩展对象的功能，遵循"开闭原则"（对扩展开放，对修改关闭）。

### 与继承的对比

| 维度 | 继承 | 装饰模式 |
| --- | --- | --- |
| 扩展方式 | 编译期静态决定 | 运行时动态组合 |
| 类数量 | 笛卡尔积爆炸（`m × n`） | 线性增长（`m + n`） |
| 灵活性 | 差 | 高 |
| 耦合度 | 与父类紧耦合 | 与抽象接口耦合 |

举例：3 种饮料 + 3 种调料，用继承需要 `2³ = 8` 个类；用装饰模式只需 `3 + 3 = 6` 个类。

---

## 二、UML 类图

```
                ┌──────────────────────┐
                │   <<interface>>      │
                │     Component        │
                ├──────────────────────┤
                │ + operation(): void  │
                └──────────△───────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
   ┌──────────┴─────────┐    ┌──────────┴─────────┐
   │   ConcreteComponent│    │     Decorator      │
   │                    │    │  - component       │
   ├────────────────────┤    ├────────────────────┤
   │ + operation()      │    │ + operation()      │
   └────────────────────┘    └──────────△─────────┘
                                     │
                          ┌──────────┴──────────┐
                          │   ConcreteDecorator │
                          ├─────────────────────┤
                          │ + operation()       │
                          │ + addedBehavior()   │
                          └─────────────────────┘
```

### 角色说明

| 角色 | 职责 |
| --- | --- |
| **Component（抽象构件）** | 定义对象的接口，可以给这些对象动态增加职责 |
| **ConcreteComponent（具体构件）** | 定义具体的对象，装饰器可以给它增加额外的职责 |
| **Decorator（抽象装饰器）** | 持有一个 Component 对象的引用，并实现与 Component 一致的接口 |
| **ConcreteDecorator（具体装饰器）** | 具体的装饰对象，给内部持有的具体构件增加具体的职责 |

---

## 三、示例 1：经典场景——咖啡订单系统

> 改编自《Head First 设计模式》星巴兹咖啡案例。
> 目录：[examples/decorator/01-coffee/](./01-coffee/)

### 1.1 抽象构件

```php
namespace Examples\Decorator\Coffee;

interface Beverage
{
    public function getDescription(): string;
    public function cost(): float;
}
```

### 1.2 抽象装饰器

```php
namespace Examples\Decorator\Coffee;

abstract class CondimentDecorator implements Beverage
{
    public function __construct(protected Beverage $beverage) {}

    abstract public function getDescription(): string;
}
```

### 1.3 具体构件

```php
namespace Examples\Decorator\Coffee;

class Espresso implements Beverage
{
    public function getDescription(): string { return 'Espresso'; }
    public function cost(): float { return 18.0; }
}

class HouseBlend implements Beverage
{
    public function getDescription(): string { return 'House Blend Coffee'; }
    public function cost(): float { return 12.0; }
}
```

### 1.4 具体装饰器

```php
namespace Examples\Decorator\Coffee;

class Mocha extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Mocha';
    }
    public function cost(): float
    {
        return $this->beverage->cost() + 5.0;
    }
}

class Whip extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Whip';
    }
    public function cost(): float
    {
        return $this->beverage->cost() + 3.0;
    }
}

class Soy extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Soy';
    }
    public function cost(): float
    {
        return $this->beverage->cost() + 4.0;
    }
}
```

### 1.5 客户端点单

```php
// 下单 1: 浓缩咖啡 + 摩卡 + 奶泡
$order1 = new Whip(new Mocha(new Espresso()));
echo $order1->getDescription() . ' $' . $order1->cost() . PHP_EOL;
// 输出：Espresso, Mocha, Whip $26

// 下单 2: 综合咖啡 + 豆浆 + 摩卡 + 奶泡
$order2 = new Whip(new Mocha(new Soy(new HouseBlend())));
echo $order2->getDescription() . ' $' . $order2->cost() . PHP_EOL;
// 输出：House Blend Coffee, Soy, Mocha, Whip $24
```

### 1.6 执行结果

```
Espresso, Mocha, Whip $26
House Blend Coffee, Soy, Mocha, Whip $24
```

---

## 四、示例 2：进阶场景——Laravel 风格 HTTP 中间件

> 真实工程里"洋葱模型"就是装饰模式的工业级实现。
> 目录：[examples/decorator/02-middleware/](./02-middleware/)

### 2.1 抽象构件

```php
namespace Examples\Decorator\Middleware;

interface Handler
{
    public function handle(Request $request): Response;
}
```

### 2.2 数据传输对象

```php
namespace Examples\Decorator\Middleware;

final class Request
{
    public function __construct(
        public string $path,
        public string $method = 'GET',
        public array $headers = [],
        public array $attributes = [],
    ) {}
}

final class Response
{
    public function __construct(
        public int $status = 200,
        public string $body = '',
        public array $headers = [],
    ) {}
}
```

### 2.3 抽象装饰器

```php
namespace Examples\Decorator\Middleware;

abstract class Middleware implements Handler
{
    public function __construct(protected ?Handler $next = null) {}

    protected function next(Request $request): Response
    {
        return $this->next?->handle($request)
            ?? new Response(404, 'Not Found');
    }
}
```

### 2.4 具体构件（最内层）

```php
namespace Examples\Decorator\Middleware;

class HelloController implements Handler
{
    public function handle(Request $request): Response
    {
        $user = $request->attributes['user'] ?? 'Guest';
        return new Response(200, "Hello, {$user}! path={$request->path}");
    }
}
```

### 2.5 具体装饰器

#### 日志中间件

```php
class LogMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $start = microtime(true);
        $response = $this->next($request);
        $cost = (microtime(true) - $start) * 1000;
        echo "[Log] {$request->method} {$request->path} -> {$response->status} ({$cost}ms)\n";
        return $response;
    }
}
```

#### 身份认证中间件

```php
class AuthMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $token = $request->headers['X-Token'] ?? null;
        if ($token === null) {
            return new Response(401, 'Unauthorized: token missing');
        }

        $users = ['token-alice' => 'Alice', 'token-bob' => 'Bob'];
        if (!isset($users[$token])) {
            return new Response(401, 'Unauthorized: invalid token');
        }

        $request->attributes['user'] = $users[$token];
        return $this->next($request);
    }
}
```

#### CORS 中间件

```php
class CorsMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $response = $this->next($request);
        $response->headers['Access-Control-Allow-Origin'] = '*';
        $response->headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE';
        return $response;
    }
}
```

#### 限流中间件

```php
class RateLimitMiddleware extends Middleware
{
    private static array $counters = [];

    public function __construct(?Handler $next = null, private int $limit = 5)
    {
        parent::__construct($next);
    }

    public function handle(Request $request): Response
    {
        $key = ($request->headers['X-Real-IP'] ?? 'unknown') . ':' . (int) (microtime(true) / 60);
        self::$counters[$key] = (self::$counters[$key] ?? 0) + 1;

        if (self::$counters[$key] > $this->limit) {
            return new Response(429, 'Too Many Requests');
        }
        return $this->next($request);
    }
}
```

### 2.6 装饰链装配（洋葱模型）

```php
final class Pipeline
{
    public static function build(): Handler
    {
        $core = new HelloController();

        // 从内向外包裹：Log -> RateLimit -> Cors -> Auth -> Core
        return new LogMiddleware(
            new RateLimitMiddleware(
                new CorsMiddleware(
                    new AuthMiddleware($core)
                ),
                limit: 3,
            )
        );
    }
}
```

### 2.7 执行结果（预期）

```
=== 请求 1：合法 token ===
HTTP 200
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET,POST,PUT,DELETE
Hello, Alice! path=/api/hello
[Log] GET /api/hello -> 200 (0.123ms)

=== 请求 2：缺失 token ===
HTTP 401
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET,POST,PUT,DELETE
Unauthorized: token missing
[Log] GET /api/hello -> 401 (0.045ms)

=== 请求 3：限流（第 4 次超限）===
HTTP 429
  ...
Too Many Requests
```

---

## 五、装饰模式的优缺点

### ✅ 优点

| 优点 | 说明 |
| --- | --- |
| 符合开闭原则 | 可以在不修改原类的情况下扩展功能 |
| 避免继承膨胀 | 类数量由 `m × n` 降为 `m + n` |
| 运行时动态组合 | 同一个对象可以被不同装饰器任意组合 |
| 职责分离 | 每个装饰器只关注一件事，符合单一职责原则（SRP） |

### ❌ 缺点

| 缺点 | 说明 |
| --- | --- |
| 类数量增多 | 装饰器多时会出现很多小类 |
| 调试复杂 | 多层包装后栈追踪变深 |
| 依赖具体类型 | 装饰器内部必须知道被装饰对象的接口细节 |
| 顺序敏感 | 装饰链里顺序变了行为也会变 |

---

## 六、典型适用场景

1. **流式 I/O**：`Java IO`、`Laravel Stream`、`Symfony Process`（一层层包装流）
2. **HTTP 中间件**：Laravel / Express / Koa（装饰链的工业级实现）
3. **横切关注点**：日志 / 缓存 / 权限 / 限流，在不侵入业务代码的前提下增强方法
4. **GUI 组件**：Swing 边框、React HOC、Vue `mixin`
5. **数据格式化管道**：JSON → 加密 → 压缩 → 输出，多层包装
6. **Repository 装饰**：在 Laravel 中给 Eloquent Repository 装饰一层 Cache Repository

---

## 七、与代理模式的区别（常见面试考点）

| 维度 | 装饰模式 | 代理模式 |
| --- | --- | --- |
| 目的 | 增强功能 | 控制访问 |
| 创建时机 | 通常由客户端主动包裹 | 一般由容器注入 |
| 是否知道被装饰对象 | 装饰器明确知道自己持有谁 | 代理常常对客户端隐藏真实对象 |
| 功能侧重 | 添加新行为 | 权限、懒加载、远程等"非业务"控制 |
| 关注点 | "我想**给对象加功能**" | "我想**控制别人怎么用对象**" |

> 一句话记忆：**装饰 = 加 buff；代理 = 找代理人办事**。

---

## 八、PHP 8+ 实战 Tips

### 8.1 用构造器属性提升简化装饰器

```php
abstract class CondimentDecorator implements Beverage
{
    public function __construct(protected Beverage $beverage) {}
}
```

### 8.2 用 readonly 让 DTO 不可变

```php
final class Request
{
    public function __construct(
        public readonly string $path,
        public readonly string $method = 'GET',
        public readonly array $headers = [],
        public array $attributes = [],   // attributes 仍可变，中间件需要注入
    ) {}
}
```

### 8.3 用枚举约束状态

```php
enum HttpMethod: string
{
    case GET = 'GET';
    case POST = 'POST';
    case PUT = 'PUT';
    case DELETE = 'DELETE';
}
```

### 8.4 在 Laravel 中的真实落地

- **路由中间件**：`Illuminate\Pipeline` 包装 `Controller`
- **Repository 装饰**：`CacheRepository` 装饰 `EloquentRepository`
- **Storage 装饰**：`Storage::disk('s3')` 实际是 `Flysystem` 适配器层层包装
- **Macroable**：`Request::macro()` 让你给对象"动态加方法"，本质也是装饰思路

---

## 九、文件清单

### 咖啡订单示例（[01-coffee/](./01-coffee/)）

| 文件 | 角色 |
| --- | --- |
| [Beverage.php](./01-coffee/Beverage.php) | 抽象构件 |
| [CondimentDecorator.php](./01-coffee/CondimentDecorator.php) | 抽象装饰器 |
| [Espresso.php](./01-coffee/Espresso.php) | 具体构件 |
| [HouseBlend.php](./01-coffee/HouseBlend.php) | 具体构件 |
| [Mocha.php](./01-coffee/Mocha.php) | 具体装饰器 |
| [Whip.php](./01-coffee/Whip.php) | 具体装饰器 |
| [Soy.php](./01-coffee/Soy.php) | 具体装饰器 |
| [StarbuzzCoffee.php](./01-coffee/StarbuzzCoffee.php) | 客户端入口 |

### HTTP 中间件示例（[02-middleware/](./02-middleware/)）

| 文件 | 角色 |
| --- | --- |
| [Handler.php](./02-middleware/Handler.php) | 抽象构件 |
| [Middleware.php](./02-middleware/Middleware.php) | 抽象装饰器 |
| [Request.php](./02-middleware/Request.php) | 请求 DTO |
| [Response.php](./02-middleware/Response.php) | 响应 DTO |
| [HelloController.php](./02-middleware/HelloController.php) | 最内层具体构件 |
| [LogMiddleware.php](./02-middleware/LogMiddleware.php) | 具体装饰器（日志） |
| [AuthMiddleware.php](./02-middleware/AuthMiddleware.php) | 具体装饰器（认证） |
| [CorsMiddleware.php](./02-middleware/CorsMiddleware.php) | 具体装饰器（CORS） |
| [RateLimitMiddleware.php](./02-middleware/RateLimitMiddleware.php) | 具体装饰器（限流） |
| [Pipeline.php](./02-middleware/Pipeline.php) | 客户端入口（装饰链装配） |

---

## 十、运行方式

```bash
# 咖啡订单
php examples/decorator/01-coffee/StarbuzzCoffee.php

# HTTP 中间件
php examples/decorator/02-middleware/Pipeline.php
```

---

## 十一、参考与扩展阅读

- 《Design Patterns: Elements of Reusable Object-Oriented Software》（GoF）— 装饰模式原始定义
- 《Head First Design Patterns》— 星巴兹咖啡案例出处
- [Refactoring Guru: Decorator Pattern](https://refactoringguru.cn/design-patterns/decorator)
- Laravel 源码：`Illuminate\Pipeline`、`Illuminate\Cache\Repository`
- Symfony 源码：`Symfony\Component\Cache\Decorator`

---

> 装饰模式是"组合优于继承"思想最经典的体现。掌握它之后，再看 Laravel 中间件、Repository 缓存包装、Stream 装饰器，都会豁然开朗。
