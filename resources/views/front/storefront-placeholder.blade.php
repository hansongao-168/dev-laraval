@extends('front.layout')

@section('title', '商城 · ERP Global')

@section('content')
<div class="relative min-h-screen bg-slate-50 text-slate-900">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#99f6e4_0,transparent_40%),linear-gradient(180deg,#f8fafc,#f1f5f9)]"></div>

    <div class="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-xl bg-teal-700 text-sm font-bold text-white">E</span>
            <p class="text-sm font-semibold text-teal-700">ERP Global</p>
        </header>

        <main class="flex flex-1 flex-col justify-center gap-6 py-16">
            <p class="text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase">Mall</p>
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">商城</h1>
            <p class="max-w-xl text-base leading-7 text-slate-600">
                商城接入中。商品列表、分类与结算能力即将接入本站入口；当前可先返回首页了解亮点。
            </p>
            <div class="flex flex-wrap gap-3">
                <a href="{{ route('home') }}"
                   class="inline-flex rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/25 hover:bg-teal-800">
                    返回首页
                </a>
            </div>
        </main>
    </div>
</div>
@endsection
