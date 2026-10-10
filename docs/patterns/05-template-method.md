# 模板方法（Template Method）实战精讲
## —— `LabelAbstract::create()` 与 `ExpressLabel\PrintReceipts\AbstractPrintReceipt::createPdf()`

> **核心结论**：模板方法在本仓库"低调"但"高频"。两处典型：**打单编排骨架** + **PDF 收据渲染骨架**。两者完全不同的业务领域，同一个模式 —— 这是教 TM 的好例子。

---

## 1. 经典定义（GoF）

> Define the skeleton of an algorithm in an operation, deferring some steps to subclasses.
> Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm's structure.

关键不是"父类有方法"，而是：

- **算法骨架在父类固定**
- **某些步骤声明为 protected abstract / 默认实现，子类可覆盖**
- **不要用 if/else，应对扩展保持稳定**

PHP 里更克制：用 `abstract class` + `final class`，骨架一次写完，子类只 override protected 方法。

---

## 2. 案例 A：`LabelAbstract` —— 打单编排的模板方法

位置：`express/logistics-order/src/Label/LabelAbstract.php`（简化）：

```php
abstract class LabelAbstract
{
    public static function make(Order $order, ?Request $request = null): static;

    /** 步骤：取 Creator（子类决定哪个 Creator） */
    abstract protected function getCreator(): CreateLabel;

    /** 步骤：是否能买保险（默认实现，子类可覆盖） */
    protected function canInsurance(Shipment $shipment): bool { return false; }

    /** 步骤：创 Shipment */
    protected function createShipment(): Shipment { /* 默认实现 */ }

    /** 步骤：处理订单状态 */
    protected function handleOrderStatus(): void { /* 默认实现 */ }

    /** 步骤：派发事件 */
    protected function dispatchEvent(): void { /* 默认实现 */ }
}
```

业务驱动类 `LabelGenerator::create()`：

```php
final class LabelGenerator
{
    /** 模板方法本身：不接收任何参数，只描述流程 */
    public function create(LabelAbstract $label): void
    {
        $label->processCanInsurance();
        $label->getCreator()->create($label->shipment());   // <-- Creator 实现来自 Strategy
        $this->processCreatePickup($label);
        $this->requestLogStorage->store($label);
        $label->createLabels();
        $label->handleOrderStatus();                       // <-- 子类 hook
        $label->dispatchEvent();                           // <-- 子类 hook
    }
}
```

> **流程骨架：`getCreator → canInsurance → create → log → handleStatus → dispatchEvent`**。**任何新增承运商**都只在它自己的 `Creator` 上做差异，写不到骨架里。

### 2.1 子类的存在形态

承运商包通过 **`LabelAbstract` + 自己加的属性** 实现差异化。例如某个承运商在子类里加：

```php
final class BpostLabelAbstract extends LabelAbstract
{
    protected function getCreator(): CreateLabel
    {
        return app(\Express\CarrierBpost\Label\Creator::class);
    }

    protected function canInsurance(Shipment $s): bool
    {
        return $s->country() === 'BE';
    }

    protected function handleOrderStatus(): void
    {
        // Bpost 内部对订单做特殊状态变更
        BpostStatusUpdater::apply(...);
    }
}
```

> **每个 hook 是"做事"，不是"分发"**——它不去 `if ($code === 'bpost') ...`，而是这个子类本身就是 Bpost 的 LabelAbstract。

---

## 3. 案例 B：`ExpressLabel\PrintReceipts\AbstractPrintReceipt` —— PDF 收据的模板方法

位置：`express/express-label/src/PrintReceipts/AbstractPrintReceipt.php`（简化）：

```php
abstract class AbstractPrintReceipt
{
    public function __construct(protected Order $order, protected PrintReceiptRequest $request) {}

    final public function createPdf(): string
    {
        $pdf = $this->buildPdf();
        $pdf->setMargins(...);
        $this->setPdfTransform($pdf);   // <-- hook
        $this->renderHeader($pdf);      // <-- hook
        $this->renderBody($pdf);        // <-- hook
        $this->renderFooter($pdf);      // <-- hook
        return $pdf->output();
    }

    abstract protected function renderHeader($pdf): void;
    abstract protected function renderBody($pdf): void;
    abstract protected function renderFooter($pdf): void;
    protected function setPdfTransform($pdf): void { /* 默认空 */ }
}
```

具体子类 `Enterprise\A4`、`Enterprise\A6`，只 override 三个 `render*` 方法。

> 注意 `createPdf()` 被声明为 **`final`**——禁止任何子类"绕开骨架"，这才是 TM 的纪律。

---

## 4. TM vs Strategy 的取舍

| 维度 | Template Method | Strategy |
|---|---|---|
| 多态对象 | 父类（一个继承树） | 接口（多个实现类） |
| 多态发生在 | 子类覆盖 hook | 容器/Registry 选实现 |
| 调用方持有 | **`LabelAbstract` 抽象类** | **`CreateLabel` 接口** |
| 已知差异点数 | 少（骨架内 hook 数） | 多（接口方法数） |
| 替换成本 | "换实现"得新建继承类 | "换实现"得新建实现类（接口已经隔离） |
| **本仓库的偏好** | 中等（`LabelAbstract`、`AbstractPrintReceipt`） | **主力**（`CreateLabel` 等三个接口族） |

> TM 在仓库里是"骨架上的小钩子"，Strategy 是"按 code 选人"。两条路并存、互补。

---

## 5. 反模式（仓库外的常见踩坑）

1. **把骨架方法 `protected` 暴露成 `public`**，破坏了"基类控制流程"的纪律。本仓库只让 `create()` 是 public，hook 全是 protected。
2. **hook 里加 if/else 分发**。`handleOrderStatus()` 不该 `if ($this->code === 'bpost') ...`，而是子类 override。
3. **hook 让子类"抛 not implemented"**。那不是模板方法，是抽象污染。仓库 hook 全部有默认实现（即使是空）。
4. **无意义的多层抽象**。`AbstractA -> AbstractB -> ConcreteC` 出现"两层空骨架"时，几乎一定是被误用的 TM。本仓库最多 2 层继承。

---

## 6. 30 秒最小复刻

```php
// 1) 算法骨架
abstract class ReportBuilder {
    final public function build(): string {
        $s = $this->header();
        $s .= $this->body();
        $s .= $this->footer();
        return $s;
    }
    abstract protected function header(): string;
    abstract protected function body(): string;
    protected function footer(): string { return "\n-- end --\n"; }
}

// 2) 多个子类（每个只覆盖骨架中的某几步）
final class MarkdownReport extends ReportBuilder {
    protected function header(): string { return "# Report\n"; }
    protected function body(): string { return "lorem ipsum\n"; }
}
final class HtmlReport extends ReportBuilder {
    protected function header(): string { return "<h1>Report</h1>"; }
    protected function body(): string { return "<p>lorem ipsum</p>"; }
}

// 3) 调用方只见抽象
class ReportService {
    public function __construct(private ReportBuilder $builder) {}
    public function render(): string { return $this->builder->build(); }
}
```

> 这就是 `AbstractPrintReceipt::createPdf()` 的同款心法：**算法骨架固定 + 钩子延迟 + 调用方零 if/else**。

---

## 7. 小结

- TM 不靠继承做"业务分支"，**靠骨架固定 + hook 延迟**。
- 本仓库两个领域各一处：`LabelAbstract`（打单流程）+ `AbstractPrintReceipt`（PDF 渲染）。
- 与 Strategy 的关系：**Strategy 选人，TM 选流程**——可以并存（仓库就是并存）。
- 看代码时别被 `abstract class` 吓到；**关键是骨架的纪律**（`final` 方法 + 步骤顺序固定）。

> 上一篇：[`04-adapter-port.md`](./04-adapter-port.md)｜下一篇：[`06-trait-mixin.md`](./06-trait-mixin.md)
