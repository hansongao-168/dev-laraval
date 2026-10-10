# 规范模式 / Schema 即代码（Specification）实战精讲
## —— `gz168/Carrier/Infrastructure/Validation/SchemaValidator` 的自研 JSON Schema 校验器

> **核心结论**：本仓库用一份**自研的迷你 JSON Schema**校验器守住了"信封进出两侧"的形状。它的简洁反而教学价值更高 —— **依赖零外部包、规则易读易改**。

---

## 1. 经典出处

- **Specification Pattern**（Evans, DDD）：把"业务规则"封装到可组合的对象里，可以 `and / or / not`。
- **Schema-as-code**（RESTful API / OpenAPI / GraphQL）：用一份机器可读的 schema 描述协议，校验器生成代码。
- **JSON Schema**（draft-07 / 2020-12）：行业标准的 schema 描述语言。

仓库的 `SchemaValidator` **不是通用 JSON Schema**，而是写了一份**只覆盖 `required / type / enum / minimum / minItems / const`** 的极简版本，配合 `contracts/*.json` 使用。

---

## 2. 仓库的契约清单

`gz168/Carrier/contracts/`：

| 文件 | 作用 |
|---|---|
| `shipping-label-envelope.v1.json` | 打单入参信封 |
| `shipping-label-envelope.v1.yaml` | 同上，便于阅读 |
| `shipping-label-result.v1.json` | 打单出参 |
| `shipping-label-result.v1.yaml` | 同上 |
| `shipping-cancellation-request.v1.json` | 作废入参 |
| `shipping-cancellation-result.v1.json` | 作废出参 |

`.json` 与 `.yaml` 同发：JSON 给机器（校验器），YAML 给人（阅读）。

---

## 3. 校验器实现（节选）

`src/Infrastructure/Validation/SchemaValidator.php`：

```php
final class SchemaValidator
{
    public function violations(array $schema, mixed $value, string $path = ''): array
    {
        return $this->check($schema, $value, $path);
    }

    public function assert(array $schema, mixed $value): void
    {
        $violations = $this->violations($schema, $value);
        if ($violations !== []) {
            throw new InvalidEnvelopeException(implode('; ', $violations));
        }
    }

    private function check(array $schema, mixed $value, string $path): array
    {
        $violations = [];
        $type = $schema['type'] ?? null;

        if ($type === 'object') {
            if (! (is_array($value) || is_object($value))) {
                return [$this->path($path) . ' must be object'];
            }
            foreach (($schema['required'] ?? []) as $key) {
                if (! array_key_exists($key, (array) $value)) {
                    $violations[] = $this->path($path === '' ? $key : $path . '.' . $key) . ' is required';
                }
            }
            foreach (($schema['properties'] ?? []) as $prop => $sub) {
                if (array_key_exists($prop, (array) $value)) {
                    $violations = array_merge(
                        $violations,
                        $this->check($sub, $value[$prop], $path === '' ? $prop : $path . '.' . $prop)
                    );
                }
            }
            return $violations;
        }

        if ($type === 'array') {
            if (! is_array($value)) return [$this->path($path) . ' must be array'];
            $itemSchema = $schema['items'] ?? null;
            foreach ($value as $i => $item) {
                if ($itemSchema) $violations = array_merge(
                    $violations,
                    $this->check($itemSchema, $item, "{$path}[{$i}]")
                );
            }
            if (isset($schema['minItems']) && count($value) < $schema['minItems']) {
                $violations[] = $this->path($path) . " minItems={$schema['minItems']} violated";
            }
            return $violations;
        }

        if ($type === 'string') {
            if (! is_string($value)) return [$this->path($path) . ' must be string'];
            if (isset($schema['enum']) && ! in_array($value, $schema['enum'], true)) {
                $violations[] = $this->path($path) . ' must be one of: ' . implode(',', $schema['enum']);
            }
            if (isset($schema['const']) && $value !== $schema['const']) {
                $violations[] = $this->path($path) . " must equal {$schema['const']}";
            }
            return $violations;
        }

        // integer / number / boolean ...

        return $violations;
    }

    private function path(string $p): string { return $p === '' ? '<root>' : $p; }
}
```

> **只有 ~80 行的 check()**，支持 `required` / `type` / `enum` / `const` / `minItems` / `properties` / `items`。**没有 `$ref` 也没有 `oneOf`** —— 这是有意的简化。

---

## 4. 业务侧的"用法"

`PrintLabel::execute()` 和 `CancelShipment::execute()` 的入参/出参都走校验：

```php
$this->validator->assert($this->schemas['print-label-envelope'], $envelope);
$result = ($this->registry->driver($code))($envelope);
$this->validator->assert($this->schemas['print-label-result'], $result);
return $result;
```

> **进出两侧都校验** —— **入参守"上游脏数据不进入内核"，出参守"下游承运商不加私有字段"**。这是典型的"Anti-Corruption Layer"二次巩固。

---

## 5. 教学价值

| 维度 | 引通用 JSON Schema | 仓库自研 |
|---|---|---|
| 引入依赖 | `opis/json-schema` 或 `justinrainbow/json-schema` | **零依赖** |
| 学习成本 | 需要懂 draft-07 / 2020-12 规范 | **看 80 行代码就懂** |
| 扩展能力 | `$ref` / `oneOf` / `allOf` 等都支持 | **按需扩展** |
| 错误信息可控性 | 框架自定 | **完全可控**（如 `path()`） |
| 适合演进 | "既然已经复杂，让它更复杂" | **"够用即停"** |
| 测试便利 | 依赖框架断言 | **只断 `array` 即得** |

> 这是 **"specification as code"** 的精髓：规则**与代码分离**（写在 JSON），校验**在运行时被复用**（每个用例都过同一道门），且**易于演进**（修改 schema 不必改 PHP 代码）。

---

## 6. 何时升级到真正 JSON Schema

当出现以下情况：

- 需要 `$ref` 复用 schema 子树
- 需要 `oneOf` / `allOf` 表达"二选一 / 同时满足"
- 需要 `format` 字段做 regexp / uri / date-time 等校验
- 团队人数多、schema 频繁演化

→ 引入 `opis/json-schema` 或迁移到 **OpenAPI** / **JSON Schema 2020-12**。

而仓库"够用即停"是**反过度设计的好范例**。

---

## 7. 反模式（仓库外的常见踩坑）

1. **校验逻辑散落在 if/else 链**。每个 controller 都自己 check 一次。"用 schema 当唯一守门"是反模式天敌。
2. **schema 写得像文档，不像契约**。**字段不写 `required` 就必填，类型不写就不能改** —— 模糊的 schema 等于无 schema。
3. **schema 在运行时拼接**：把"按环境变 schema"当优化，结果出问题时不知道是哪份 schema 校验过。
4. **不校验出参**：只校验入参意味着任意外部响应都会污染业务 —— 仓库进出两侧都过一遍。

---

## 8. 30 秒最小复刻

```php
// 1) 同一份 schema，可以 .json/.yaml/.php 写
$userSchema = [
    'type' => 'object',
    'required' => ['id', 'email'],
    'properties' => [
        'id'    => ['type' => 'integer', 'minimum' => 1],
        'email' => ['type' => 'string'],
        'role'  => ['type' => 'string', 'enum' => ['admin', 'user']],
    ],
];

// 2) 校验器（仓库风格的极简版）
final class Assert {
    public static function object(array $schema, array $value, string $root = '$'): void {
        foreach ($schema['required'] ?? [] as $k) {
            if (! array_key_exists($k, $value)) throw new \DomainException("$root.$k is required");
        }
        foreach (($schema['properties'] ?? []) as $k => $sub) {
            if (! array_key_exists($k, $value)) continue;
            if (($sub['type'] ?? null) === 'string' && ! is_string($value[$k])) {
                throw new \DomainException("$root.$k must be string");
            }
            if (isset($sub['enum']) && ! in_array($value[$k], $sub['enum'], true)) {
                throw new \DomainException("$root.$k must be one of: " . implode(',', $sub['enum']));
            }
        }
    }
}

// 3) 用法
Assert::object($userSchema, $req->all(), '$.user');
```

> 这就是仓库 `SchemaValidator` 的同款心法：**契约即代码、契约即测试、契约即文档**。

---

## 9. 小结

- Specification Pattern 的精要：把"业务规则"封装为可执行、可复用的对象。
- 仓库用极简 Schema 做"信封进出守门"，**进出两侧都校验 = ACL 的字面加强**。
- 演进路径：**够用即停 → 需要时升级到通用 JSON Schema / OpenAPI**。

> 上一篇：[`08-fitness-function.md`](./08-fitness-function.md)｜下一篇：[`10-orchestrator.md`](./10-orchestrator.md)
