<?php

namespace Tests\Support;

use Gz168\Customer\Shared\Models\Customer;

/**
 * 宿主测试专用 Customer 子类 — CustomerModels 要求配置的模型必须是
 * 模块 Customer 的子类（is_subclass_of 对自身返回 false），因此
 * customer.model 配置在测试中需要指向本类。
 */
class HostTestCustomer extends Customer
{
    protected $table = 'customers';
}
