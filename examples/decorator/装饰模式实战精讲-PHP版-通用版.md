# 装饰模式实战精讲（PHP 版 · 通用版）

> **基于经典 Python 案例的 PHP 8 完整实现**
> 配套可运行源码位于 `examples/decorator/from-python/`
> 生成时间：2026-10-12 · 适用 PHP 8.2+ · 装饰模式 · Laravel 中间件

---

## 目录

> 本目录是手写版，**部分 Markdown 编辑器**（VS Code、Typora、Obsidian、IDEA）会在导出时自动按 H1/H2 重新生成。

- [前言](#前言)
- [第一章 · 模式定义与核心思想](#第一章--模式定义与核心思想)
- [第二章 · UML 类图与角色](#第二章--uml-类图与角色)
- [第三章 · Python `@decorator` 语法 vs PHP 手动包装](#第三章--python-decorator-语法-vs-php-手动包装)
- [第四章 · 类装饰器（最经典形态）](#第四章--类装饰器最经典形态)
- [第五章 · 带参数的装饰器（装饰器工厂）](#第五章--带参数的装饰器装饰器工厂)
- [第六章 · `functools.wraps` 等价物：保留元数据](#第六章--functoolswraps-等价物保留元数据)
- [第七章 · 多个装饰器叠加（洋葱模型）](#第七章--多个装饰器叠加洋葱模型)
- [第八章 · 类方法装饰器](#第八章--类方法装饰器)
- [第九章 · PHP 8 Attribute：声明式装饰](#第九章--php-8-attribute声明式装饰)
- [第十章 · `@property` → PHP `readonly`](#第十章--property--php-readonly)
- [第十一章 · `@contextmanager` → PHP `__destruct`](#第十一章--contextmanager--php-__destruct)
- [第十二章 · `@dataclass(frozen=True)` → PHP `readonly class`](#第十二章--dataclassfrozentrue--php-readonly-class)
- [第十三章 · `@lru_cache` → PHP 记忆化](#第十三章--lru_cache--php-记忆化)
- [第十四章 · `@abc.abstractmethod` → PHP 抽象](#第十四章--abcabstractmethod--php-抽象)
- [第十五章 · `@total_ordering` → PHP `<=>`](#第十五章--total_ordering--php-)
- [第十六章 · Python vs PHP 装饰模式核心差异](#第十六章--python-vs-php-装饰模式核心差异)
- [第十七章 · 完整对照表](#第十七章--完整对照表)
- [第十八章 · 总结](#第十八章--总结)

---

## 前言

本文档基于原 Python 版《装饰模式实战精讲》全部案例，
改写为 **PHP 8.2+** 实现，配套可运行源码位于
`examples/decorator/from-python/`。

### 读者对象

- 熟悉 Python 装饰器，想了解 PHP 中对应实现方式的开发者
- 学习设计模式，希望看到工业级真实落地的工程师
- Laravel / Symfony 框架使用者，希望理解中间件、Repository 装饰等机制的原理

### 阅读方式

| 你的目标 | 建议阅读顺序 |
| --- | --- |
| 速通概念 | 第 1、2、18 章 |
| 写代码 | 第 3 ~ 15 章（每章都有可运行示例） |
| 面试准备 | 第 16、17 章对照表 + 第 18 章总结 |

### 运行示例

```bash
# 进入示例目录
cd examples/decorator/from-python

# 任选一个文件直接运行
php 02-class-decorator.php
```

---

## 第一章 · 模式定义与核心思想

装饰模式（Decorator Pattern）是一种**结构型设计模式**，
允许向一个现有对象**动态地添加新的功能**，
而不改变其结构。

**核心思想**：通过**组合**而非**继承**来扩展对象的功能，
遵循"开闭原则"（对扩展开放，对修改关闭）。

### 与继承的对比

| 维度 | 继承 | 装饰模式 |
| --- | --- | --- |
| 扩展方式 | 编译期静态决定 | 运行时动态组合 |
| 类数量 | 笛卡尔积爆炸（`m × n`） | 线性增长（`m + n`） |
| 灵活性 | 差 | 高 |
| 耦合度 | 与父类紧耦合 | 与抽象接口耦合 |

> 举例：3 种饮料 + 3 种调料，用继承需要 `2³ = 8` 个类；
> 用装饰模式只需 `3 + 3 = 6` 个类。

---

## 第二章 · UML 类图与角色

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
| **Component（抽象构件）** | 定义对象的接口 |
| **ConcreteComponent（具体构件）** | 定义具体的对象 |
| **Decorator（抽象装饰器）** | 持有 Component 引用，实现与 Component 一致的接口 |
| **ConcreteDecorator（具体装饰器）** | 给内部持有的具体构件增加具体的职责 |

---

## 第三章 · Python `@decorator` 语法 vs PHP 手动包装

### Python 版

```python
def logger(func):
    def wrapper(*args, **kwargs):
        print(f"[LOG] call {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@logger
def hello(name):
    return f"Hello, {name}"
```

### PHP 版

PHP **没有** `@decorator` 语法糖，但实现完全等价：

```php
namespace Examples\Decorator\FromPython;

function hello(string $name): string
{
    return "Hello, {$name}";
}

function logger(callable $func): callable
{
    return function (...$args) use ($func) {
        echo "[LOG] call " . ($func.__FUNCTION__ ?? 'closure') . PHP_EOL;
        return $func(...$args);
    };
}

$decorated = logger('Examples\\Decorator\\FromPython\\hello');
echo $decorated('World') . PHP_EOL;
```

> 📁 完整文件：`examples/decorator/from-python/01-function-wrapper.php`

---

## 第四章 · 类装饰器（最经典形态）

### Python 版

```python
class Coffee:
    def cost(self): return 10
    def desc(self): return "Coffee"

class Mocha:
    def __init__(self, beverage): self.beverage = beverage
    def cost(self): return self.beverage.cost() + 5
    def desc(self): return self.beverage.desc() + ", Mocha"
```

### PHP 版（接口 + 抽象装饰器）

```php
namespace Examples\Decorator\FromPython;

interface Beverage
{
    public function desc(): string;
    public function cost(): float;
}

class Coffee implements Beverage
{
    public function desc(): string { return 'Coffee'; }
    public function cost(): float { return 10.0; }
}

abstract class Condiment implements Beverage
{
    public function __construct(protected Beverage $beverage) {}
    abstract public function desc(): string;
}

class Mocha extends Condiment
{
    public function desc(): string { return $this->beverage->desc() . ', Mocha'; }
    public function cost(): float { return $this->beverage->cost() + 5.0; }
}

class Whip extends Condiment
{
    public function desc(): string { return $this->beverage->desc() . ', Whip'; }
    public function cost(): float { return $this->beverage->cost() + 3.0; }
}

// 使用
$order = new Whip(new Mocha(new Coffee()));
echo $order->desc() . ' $' . $order->cost() . PHP_EOL;
// Coffee, Mocha, Whip $18
```

> 📁 完整文件：`examples/decorator/from-python/02-class-decorator.php`

---

## 第五章 · 带参数的装饰器（装饰器工厂）

### Python 版

```python
def repeat(times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            result = None
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)
def greet():
    print("Hi")
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

function repeat(int $times): callable
{
    return static function (callable $func): callable {
        return static function (...$args) use ($func, $times) {
            $result = null;
            for ($i = 0; $i < $times; $i++) {
                $result = $func(...$args);
            }
            return $result;
        };
    };
}

function greet(): string
{
    echo "Hi" . PHP_EOL;
    return 'done';
}

$decorated = repeat(3)('Examples\\Decorator\\FromPython\\greet');
$decorated();
```

> 📁 完整文件：`examples/decorator/from-python/03-decorator-factory.php`

---

## 第六章 · `functools.wraps` 等价物：保留元数据

### Python 版

```python
import functools

def logger(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
```

### PHP 版（反射 + 注解）

```php
namespace Examples\Decorator\FromPython;

use ReflectionFunction;
use ReflectionMethod;

/** 打招呼 */
function greet(string $name): string
{
    return "Hello, {$name}";
}

function logger(callable $func): callable
{
    $ref = $func instanceof \Closure
        ? new ReflectionFunction($func)
        : new ReflectionFunction(\Closure::fromCallable($func));

    $originalDoc = $ref->getDocComment() ?: '';

    return new class($func, $originalDoc) {
        public function __construct(
            private $callable,
            public readonly string $originalDoc,
        ) {}

        public function __invoke(...$args)
        {
            echo "[wraps] original doc: " . trim($this->originalDoc) . PHP_EOL;
            return ($this->callable)(...$args);
        }
    };
}
```

> 📁 完整文件：`examples/decorator/from-python/04-preserve-metadata.php`

---

## 第七章 · 多个装饰器叠加（洋葱模型）

### Python 版

```python
@logger
@timer
@repeat(2)
def work():
    print("working")
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

function logger(callable $func): callable
{
    return static function (...$args) use ($func) {
        echo "[logger] enter" . PHP_EOL;
        $r = $func(...$args);
        echo "[logger] exit" . PHP_EOL;
        return $r;
    };
}

function timer(callable $func): callable
{
    return static function (...$args) use ($func) {
        $start = microtime(true);
        $r = $func(...$args);
        echo "[timer] " . round((microtime(true) - $start) * 1000, 3) . "ms" . PHP_EOL;
        return $r;
    };
}

function repeat(int $times): callable
{
    return static function (callable $func): callable {
        return static function (...$args) use ($func, $times) {
            $r = null;
            for ($i = 0; $i < $times; $i++) {
                $r = $func(...$args);
            }
            return $r;
        };
    };
}

function work(): string
{
    echo "  working..." . PHP_EOL;
    return "result";
}

// 等价于 Python 的 @logger @timer @repeat(2)
$decorated = logger(timer(repeat(2)('Examples\\Decorator\\FromPython\\work')));
$decorated();
```

> 📁 完整文件：`examples/decorator/from-python/05-stacked-decorators.php`

---

## 第八章 · 类方法装饰器

### Python 版

```python
class Repo:
    def get(self, id): return {"id": id}
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

interface Repository
{
    public function get(int $id): array;
}

class DbRepository implements Repository
{
    public function get(int $id): array
    {
        return ['id' => $id, 'source' => 'db'];
    }
}

abstract class RepositoryDecorator implements Repository
{
    public function __construct(protected Repository $repo) {}
    abstract public function get(int $id): array;
}

class CacheRepository extends RepositoryDecorator
{
    private array $cache = [];

    public function get(int $id): array
    {
        if (isset($this->cache[$id])) {
            echo "[cache] hit {$id}" . PHP_EOL;
            return $this->cache[$id];
        }
        $data = $this->repo->get($id);
        $this->cache[$id] = $data;
        echo "[cache] miss {$id}, stored" . PHP_EOL;
        return $data;
    }
}

class LoggingRepository extends RepositoryDecorator
{
    public function get(int $id): array
    {
        echo "[log] get({$id})" . PHP_EOL;
        return $this->repo->get($id);
    }
}

$repo = new LoggingRepository(new CacheRepository(new DbRepository()));
print_r($repo->get(1));
print_r($repo->get(1));
print_r($repo->get(2));
```

> 📁 完整文件：`examples/decorator/from-python/06-method-decorator.php`

---

## 第九章 · PHP 8 Attribute：声明式装饰

> Python 没有内建的"装饰器声明标记"语法糖，
> PHP 8 引入 `#[Attribute]`，可以用 `#[Logger]` 直接"标注"函数/方法，
> 运行时通过反射读取并应用 —— 这是 PHP 的"装饰器运行时"。

```php
namespace Examples\Decorator\FromPython;

use Attribute;

#[Attribute(Attribute::TARGET_FUNCTION | Attribute::TARGET_METHOD)]
class Logger
{
    public function __construct(public string $prefix = '[LOG]') {}
}

#[Attribute(Attribute::TARGET_FUNCTION | Attribute::TARGET_METHOD)]
class Timer
{
    public function __construct(public bool $enabled = true) {}
}

#[Logger(prefix: '[USER]')]
#[Timer]
class UserService
{
    public function create(string $name): array
    {
        return ['name' => $name, 'created_at' => date('c')];
    }
}

final class DecoratorRunner
{
    public static function run(object $obj, string $method, array $args): mixed
    {
        $ref = new \ReflectionMethod($obj, $method);
        $callable = $obj->{$method}(...);

        foreach (array_reverse($ref->getAttributes()) as $attr) {
            $decorator = $attr->newInstance();
            $callable = match (true) {
                $decorator instanceof Logger => static function (...$a) use ($callable, $decorator) {
                    echo "{$decorator->prefix} enter" . PHP_EOL;
                    $r = $callable(...$a);
                    echo "{$decorator->prefix} exit" . PHP_EOL;
                    return $r;
                },
                $decorator instanceof Timer => static function (...$a) use ($callable, $decorator) {
                    if (!$decorator->enabled) return $callable(...$a);
                    $start = microtime(true);
                    $r = $callable(...$a);
                    echo "[TIMER] " . round((microtime(true) - $start) * 1000, 3) . "ms" . PHP_EOL;
                    return $r;
                },
            };
        }

        return $callable(...$args);
    }
}

$svc = new UserService();
$result = DecoratorRunner::run($svc, 'create', ['Alice']);
print_r($result);
```

> 📁 完整文件：`examples/decorator/from-python/07-php-attribute.php`

---

## 第十章 · `@property` → PHP `readonly`

### Python 版

```python
class Circle:
    def __init__(self, r): self._r = r
    @property
    def area(self): return 3.14 * self._r ** 2
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

final class Circle
{
    public function __construct(public readonly float $r) {}

    public function area(): float
    {
        return 3.14 * $this->r ** 2;
    }
}
```

> 📁 完整文件：`examples/decorator/from-python/08-property-decorator.php`

---

## 第十一章 · `@contextmanager` → PHP `__destruct`

### Python 版

```python
from contextlib import contextmanager

@contextmanager
def timer():
    start = time.time()
    yield
    print(f"cost: {time.time() - start}s")

with timer():
    do_work()
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

final class TimerContext
{
    private float $start;
    private string $label;

    public function __construct(string $label = 'block')
    {
        $this->label = $label;
        $this->start = microtime(true);
    }

    public function __destruct()
    {
        $cost = microtime(true) - $this->start;
        echo "[{$this->label}] cost: " . round($cost * 1000, 3) . "ms" . PHP_EOL;
    }
}

function measure(string $label, callable $work): mixed
{
    $ctx = new TimerContext($label);
    try {
        return $work();
    } finally {
        unset($ctx);
    }
}
```

> 📁 完整文件：`examples/decorator/from-python/09-contextmanager.php`

---

## 第十二章 · `@dataclass(frozen=True)` → PHP `readonly class`

### Python 版

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    age: int
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

final readonly class User
{
    public function __construct(
        public string $name,
        public int $age,
    ) {}
}
```

> 📁 完整文件：`examples/decorator/from-python/10-dataclass.php`

---

## 第十三章 · `@lru_cache` → PHP 记忆化

### Python 版

```python
import functools

@functools.lru_cache(maxsize=128)
def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

function memoize(callable $func, int $maxSize = 128): callable
{
    $cache = [];
    $keys  = [];

    return static function (...$args) use (&$cache, &$keys, $func, $maxSize) {
        $key = md5(serialize($args));
        if (isset($cache[$key])) {
            echo "[memo] hit" . PHP_EOL;
            return $cache[$key];
        }
        echo "[memo] miss" . PHP_EOL;
        $r = $func(...$args);
        $cache[$key] = $r;
        $keys[] = $key;
        if (count($keys) > $maxSize) {
            unset($cache[array_shift($keys)]);
        }
        return $r;
    };
}
```

> 📁 完整文件：`examples/decorator/from-python/11-memoize.php`

---

## 第十四章 · `@abc.abstractmethod` → PHP 抽象

### Python 版

```python
import abc

class Shape(abc.ABC):
    @abc.abstractmethod
    def area(self): ...
```

### PHP 版（原生支持，无需装饰）

```php
namespace Examples\Decorator\FromPython;

interface Shape
{
    public function area(): float;
}

class Square implements Shape
{
    public function __construct(public float $side) {}
    public function area(): float { return $this->side ** 2; }
}
```

> 📁 完整文件：`examples/decorator/from-python/12-abstractmethod.php`

---

## 第十五章 · `@total_ordering` → PHP `<=>`

### Python 版

```python
import functools
@functools.total_ordering
class Version:
    def __init__(self, s): self.v = tuple(map(int, s.split('.')))
    def __eq__(self, o): return self.v == o.v
    def __lt__(self, o): return self.v < o.v
```

### PHP 版

```php
namespace Examples\Decorator\FromPython;

final class Version implements \Stringable
{
    public function __construct(public readonly array $parts) {}

    public static function of(string $s): self
    {
        return new self(array_map('intval', explode('.', $s)));
    }

    public function compareTo(self $other): int
    {
        return $this->parts <=> $other->parts;
    }

    public function equals(self $o): bool      { return $this->compareTo($o) === 0; }
    public function lessThan(self $o): bool    { return $this->compareTo($o) < 0; }
    public function greaterThan(self $o): bool { return $this->compareTo($o) > 0; }

    public function __toString(): string { return implode('.', $this->parts); }
}
```

> 📁 完整文件：`examples/decorator/from-python/13-total-ordering.php`

---

## 第十六章 · Python vs PHP 装饰模式核心差异

| 维度 | Python | PHP |
| --- | --- | --- |
| **语法糖** | `@decorator` 一行搞定 | 没有原生语法糖，要手动嵌套 |
| **类型系统** | 动态类型 | 强类型（PHP 8.2+ 完善） |
| **装饰声明** | 紧贴函数书写 | PHP 8 引入 `#[Attribute]`（更解耦） |
| **元数据保留** | `functools.wraps` | Reflection + 匿名类 |
| **执行时机** | 模块加载时立即装饰 | 运行时按需包装 |
| **可读性** | 装饰链一目了然 | 嵌套调用从右往左读 |
| **可组合性** | 多层叠加简洁 | 等价但代码长 |

---

## 第十七章 · 完整对照表

| # | Python 装饰器 | 用途 | PHP 等价实现 |
| --- | --- | --- | --- |
| 1 | `@logger` 函数装饰 | 给函数加日志 | 闭包 `callable` 包装 |
| 2 | 类装饰（最经典） | 增强对象功能 | 抽象装饰器继承 |
| 3 | `@repeat(3)` | 装饰器工厂 | 工厂返回 `callable` |
| 4 | `@functools.wraps` | 保留元数据 | Reflection + 匿名类 |
| 5 | 多层装饰器叠加 | 洋葱模型 | 嵌套 `callable` 调用 |
| 6 | 类方法装饰 | 增强方法 | 装饰器类继承 `Component` |
| 7 | 装饰器声明式 | 标记/标注 | **PHP 8 Attribute**（独有） |
| 8 | `@property` | 计算属性 | `readonly` 属性 |
| 9 | `@contextmanager` | 进入/退出 | `__destruct` + `try/finally` |
| 10 | `@dataclass(frozen=True)` | 不可变数据类 | `readonly class` |
| 11 | `@lru_cache` | 记忆化缓存 | `memoize()` 闭包 |
| 12 | `@abc.abstractmethod` | 抽象方法 | `abstract` / `interface` |
| 13 | `@total_ordering` | 全序比较 | `<=>` + `compareTo` |

---

## 第十八章 · 总结

如果你只想**记住一句话**：

> **Python 的 `@decorator` 糖，在 PHP 里就是"嵌套调用 + 接口/抽象类"；
> PHP 8 的 `#[Attribute]` 是 Python 装饰器的"声明式对偶"。**

所有 13 个示例都已保存到
`examples/decorator/from-python/`，每个文件都**可以直接
`php 文件名.php` 运行**。
