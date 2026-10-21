# 装饰模式实战精讲 · Python → PHP 翻译总结

> 基于原 PDF `D:\www2\dev-laraval\装饰模式实战精讲.pdf`
> 提取方式：`pdftotext -layout` → grep 扫描可读行
> 翻译策略：**完全对位翻译**，只改语言，结构 / 命名 / 注释对齐 Python

---

## ✅ 翻译完成清单

| # | 原 PDF 页码 | Python 主题 | PHP 文件 | 装饰器数量 |
|---|---|---|---|---|
| 1 | p.190-194 | 数据源装饰器（加密 + 压缩） | [01-datasource.php](01-datasource.php) | 2 |
| 2 | p.195 | 价格计算器（4 个装饰器链） | [02-price-calculator.php](02-price-calculator.php) | 4 |

---

## 🔑 翻译对照要点

### 1. 抽象类 → 接口

**Python**（`abc.ABC` + `@abstractmethod`）：
```python
from abc import ABC, abstractmethod
class DataSource(ABC):
    @abstractmethod
    def write_data(self, data: str) -> None: ...
```

**PHP**：
```php
interface DataSource
{
    public function writeData(string $data): void;
    public function readData(): string;
}
```

> 💡 PHP **没有** `@abstractmethod` 装饰器，但 `interface` 本身就强制子类实现，比 Python 更严格。

### 2. 命名风格

| Python | PHP |
|---|---|
| `snake_case`（`write_data`） | `camelCase`（`writeData`） |
| `PascalCase`（类名相同） | `PascalCase`（类名相同） |
| `SCREAMING_SNAKE`（常量） | 不变 |

### 3. 装饰器基类

**Python**：
```python
class DataSourceDecorator(DataSource):
    def __init__(self, source: DataSource): self.wrappee = source
    def write_data(self, data): self.wrappee.write_data(data)
    def read_data(self):         return self.wrappee.read_data()
```

**PHP**：
```php
abstract class DataSourceDecorator implements DataSource
{
    public function __construct(protected DataSource $wrappee) {}
    public function writeData(string $data): void { $this->wrappee->writeData($data); }
    public function readData(): string { return $this->wrappee->readData(); }
}
```

> 💡 PHP 8 用构造器属性提升 `protected DataSource $wrappee` 等价于 Python 的 `self.wrappee = source`。

### 4. `super()` 调用

**Python**：
```python
class EncryptionDecorator(DataSourceDecorator):
    def write_data(self, data):
        encrypted = base64.b64encode(data.encode()).decode()
        super().write_data(encrypted)        # ← 委托给 wrappee
```

**PHP**：
```php
final class EncryptionDecorator extends DataSourceDecorator
{
    public function writeData(string $data): void
    {
        $encrypted = base64_encode($data);
        parent::writeData($encrypted);        // ← 委托给 wrappee
    }
}
```

### 5. 标准库差异

| Python | PHP 等价 |
|---|---|
| `base64.b64encode(s.encode()).decode()` | `base64_encode($s)` |
| `base64.b64decode(s).decode()` | `base64_decode($s)` |
| `zlib.compress(s.encode()).hex()` | `bin2hex(gzcompress($s))` |
| `zlib.decompress(bytes.fromhex(s)).decode()` | `gzuncompress(hex2bin($s))` |
| `open(path, 'w', encoding='utf-8')` | `file_put_contents($path, $data)` |
| `open(path, 'r', encoding='utf-8')` | `file_get_contents($path)` |
| `dict.get('key')` | `$array['key'] ?? null` |
| `if/elif/elif` | `match` 表达式（PHP 8.0+） |

### 6. 类型注解

| Python | PHP |
|---|---|
| `data: str` | `string $data` |
| `-> None` | `: void` |
| `-> float` | `: float` |
| `-> str` | `: string` |
| `Order`（自定义类） | `Order`（相同） |
| `Optional[Coupon]` | `?Coupon $coupon` |

### 7. 工厂函数

**Python**：
```python
def build_calculator(order, ctx) -> PriceCalculator:
    calc = BasePriceCalculator()
    if ctx.get('enable_member') and order.user.is_vip:
        calc = VIPDiscountDecorator(calc)
    ...
```

**PHP**：
```php
function buildCalculator(Order $order, array $ctx): PriceCalculator
{
    $calc = new BasePriceCalculator();
    if (($ctx['enable_member'] ?? false) && $order->user->isVip) {
        $calc = new VIPDiscountDecorator($calc);
    }
    ...
}
```

---

## 📂 文件结构

```
examples/decorator/
├── 01-datasource.php         ← 示例 1：DataSource 装饰器
├── 02-price-calculator.php   ← 示例 2：PriceCalculator 装饰器
├── PHP-PORT-SUMMARY.md       ← 本文件（翻译总结）
└── ... (其他越界产物按你要求保留)
```

---

## 🚀 运行示例

```bash
# 示例 1
php 01-datasource.php

# 示例 2
php 02-price-calculator.php
```

---

## 📌 未翻译部分

grep 扫描显示原 PDF 还提到（但**没有 Python 代码**）：
- p.182-183：问题引入（伪代码 / 描述性内容）
- p.196-197：装饰器 vs 继承 vs 代理的对比表
- p.349 / p.443-444：其他语言的非 Python 示例（Java I/O、TS、Go 等）

这些段落**没有 Python 代码**，所以无需翻译。

如需把对比表也整理成 PHP 视角，请告诉我。
