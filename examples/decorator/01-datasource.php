<?php

declare(strict_types=1);

/**
 * 装饰模式实战精讲（PHP 版）
 *
 * 示例 1（p.190-194）：数据源装饰器
 * 原 Python 代码：
 *
 *   from abc import ABC, abstractmethod
 *   import base64, zlib
 *
 *   # 抽象构件
 *   class DataSource(ABC):
 *       @abstractmethod
 *       def write_data(self, data: str) -> None: ...
 *
 *       @abstractmethod
 *       def read_data(self) -> str: ...
 *
 *   # 具体构件
 *   class FileDataSource(DataSource):
 *       def __init__(self, filename): self.filename = filename
 *       def write_data(self, data):
 *           with open(self.filename, 'w', encoding='utf-8') as f: f.write(data)
 *       def read_data(self):
 *           with open(self.filename, 'r', encoding='utf-8') as f: return f.read()
 *
 *   # 装饰器基类
 *   class DataSourceDecorator(DataSource):
 *       def __init__(self, source: DataSource): self.wrappee = source
 *       def write_data(self, data): self.wrappee.write_data(data)
 *       def read_data(self):         return self.wrappee.read_data()
 *
 *   # 具体装饰器 A：加密
 *   class EncryptionDecorator(DataSourceDecorator):
 *       def write_data(self, data):
 *           encrypted = base64.b64encode(data.encode()).decode()
 *           super().write_data(encrypted)
 *       def read_data(self):
 *           return base64.b64decode(super().read_data()).decode()
 *
 *   # 具体装饰器 B：压缩
 *   class CompressionDecorator(DataSourceDecorator):
 *       def write_data(self, data):
 *           compressed = zlib.compress(data.encode()).hex()
 *           super().write_data(compressed)
 *       def read_data(self):
 *           return zlib.decompress(bytes.fromhex(super().read_data())).decode()
 *
 *   if __name__ == "__main__":
 *       salary = "name=...,salary=10000;...salary=15000"
 *       # 3 层装饰叠加
 *       source = EncryptionDecorator(
 *           CompressionDecorator(
 *               FileDataSource("salary.dat")))
 *       source.write_data(salary)
 *       print(source.read_data())
 */

namespace Examples\Decorator\FromPdf;

/* ============================================================
 * 抽象构件（对应 Python 的 class DataSource(ABC)）
 * ============================================================ */
interface DataSource
{
    public function writeData(string $data): void;
    public function readData(): string;
}

/* ============================================================
 * 具体构件（对应 Python 的 class FileDataSource(DataSource)）
 * ============================================================ */
final class FileDataSource implements DataSource
{
    public function __construct(private string $filename) {}

    public function writeData(string $data): void
    {
        // 对应 Python: with open(self.filename, 'w', encoding='utf-8') as f: f.write(data)
        file_put_contents($this->filename, $data);
    }

    public function readData(): string
    {
        // 对应 Python: with open(self.filename, 'r', encoding='utf-8') as f: return f.read()
        $content = file_get_contents($this->filename);
        return $content === false ? '' : $content;
    }
}

/* ============================================================
 * 装饰器基类（对应 Python 的 class DataSourceDecorator(DataSource)）
 * ============================================================ */
abstract class DataSourceDecorator implements DataSource
{
    public function __construct(protected DataSource $wrappee) {}

    // 子类可以选择性 override，默认透传给被装饰对象
    public function writeData(string $data): void
    {
        $this->wrappee->writeData($data);
    }

    public function readData(): string
    {
        return $this->wrappee->readData();
    }
}

/* ============================================================
 * 具体装饰器 A：加密（对应 Python 的 EncryptionDecorator）
 * 用 base64 编码模拟 Python 的 base64.b64encode
 * ============================================================ */
final class EncryptionDecorator extends DataSourceDecorator
{
    public function writeData(string $data): void
    {
        // 对应 Python: base64.b64encode(data.encode()).decode()
        $encrypted = base64_encode($data);
        // 委托给被装饰对象继续处理
        parent::writeData($encrypted);
    }

    public function readData(): string
    {
        // 对应 Python: base64.b64decode(super().read_data()).decode()
        return base64_decode(parent::readData());
    }
}

/* ============================================================
 * 具体装饰器 B：压缩（对应 Python 的 CompressionDecorator）
 * 用 gzcompress / gzuncompress 模拟 Python 的 zlib
 * （再 hex 编码是因为文件中是 hex 字符串，模拟 Python 的 .hex()）
 * ============================================================ */
final class CompressionDecorator extends DataSourceDecorator
{
    public function writeData(string $data): void
    {
        // 对应 Python: zlib.compress(data.encode()).hex()
        $compressed = bin2hex(gzcompress($data));
        parent::writeData($compressed);
    }

    public function readData(): string
    {
        // 对应 Python: zlib.decompress(bytes.fromhex(super().read_data())).decode()
        return gzuncompress(hex2bin(parent::readData()));
    }
}

/* ============================================================
 * 客户端（对应 Python 的 if __name__ == "__main__": 块）
 * 装饰链：Encryption → Compression → File
 * ============================================================ */
function main(): void
{
    $salary = 'name=...,salary=10000;...salary=15000';

    // 对应 Python:
    //   source = EncryptionDecorator(
    //       CompressionDecorator(
    //           FileDataSource("salary.dat")))
    $source = new EncryptionDecorator(
        new CompressionDecorator(
            new FileDataSource('salary.dat')
        )
    );

    $source->writeData($salary);
    echo $source->readData() . PHP_EOL;

    // 清理临时文件
    @unlink('salary.dat');
}

main();
