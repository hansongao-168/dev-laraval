<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 6: 类方法装饰器
 *
 * Python 等价:
 *   class Repo:
 *       def get(self, id): return {"id": id}
 *
 *       @staticmethod
 *       @logger
 *       def hello(): return "hi"
 *
 * PHP: 通过 __call 拦截未定义方法，实现"动态装饰"。
 */

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
    /** @var array<int, array> */
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

// ---------- 使用 ----------
$repo = new LoggingRepository(new CacheRepository(new DbRepository()));
print_r($repo->get(1));
print_r($repo->get(1));
print_r($repo->get(2));
