@extends('front.layout')

@section('title', 'ERP Global')

@section('content')
<div class="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
    <header class="flex items-center justify-between">
        <p class="text-sm font-semibold tracking-wide text-teal-700">ERP Global</p>
    </header>

    <main class="flex flex-1 flex-col justify-center gap-10 py-16">
        <div class="max-w-2xl space-y-6">
            <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">精选好物，一站购齐</h1>
            <a href="{{ route('storefront') }}"
               class="inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                进入商城
            </a>
        </div>

        <section class="grid gap-6 sm:grid-cols-3">
            <article>
                <h2 class="font-semibold">精选商品</h2>
                <p class="mt-2 text-sm text-slate-600">严选品质，持续上新。</p>
            </article>
            <article>
                <h2 class="font-semibold">放心购物</h2>
                <p class="mt-2 text-sm text-slate-600">流程清晰，保障交易。</p>
            </article>
            <article>
                <h2 class="font-semibold">售后帮助</h2>
                <p class="mt-2 text-sm text-slate-600">问题可查，服务可达。</p>
            </article>
        </section>
    </main>

    <footer class="border-t border-slate-200 py-6 text-sm text-slate-500">
        © {{ date('Y') }} ERP Global
    </footer>
</div>
@endsection
