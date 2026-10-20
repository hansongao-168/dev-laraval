@extends('front.layout')

@section('title', 'ERP Global')

@section('content')
<div class="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#99f6e4_0,transparent_42%),linear-gradient(160deg,#f8fafc,#ecfeff_45%,#f1f5f9)]"></div>

    <div class="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-teal-700 text-sm font-bold text-white shadow-lg shadow-teal-700/25">E</span>
                <div>
                    <p class="font-semibold tracking-tight">ERP Global</p>
                    <p class="text-xs text-slate-500">精选商城入口</p>
                </div>
            </div>
            <a href="{{ route('storefront') }}" class="text-sm font-medium text-teal-700 hover:underline">进入商城</a>
        </header>

        <main class="flex flex-1 flex-col justify-center gap-12 py-16">
            <div class="max-w-2xl space-y-6">
                <p class="text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase">Storefront</p>
                <h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">精选好物，一站购齐</h1>
                <p class="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    浏览精选商品、放心下单，售后问题也能快速找到帮助。商城能力正在接入，先从这里开始探索。
                </p>
                <div class="flex flex-wrap gap-3">
                    <a href="{{ route('storefront') }}"
                       class="inline-flex rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-800">
                        进入商城
                    </a>
                    <a href="#selling-points"
                       class="inline-flex rounded-xl border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                        了解亮点
                    </a>
                </div>
            </div>

            <section id="selling-points" class="grid gap-4 sm:grid-cols-3">
                <article class="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
                    <h2 class="text-base font-semibold">精选商品</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">严选品质，持续上新，帮你更快找到想要的好物。</p>
                </article>
                <article class="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
                    <h2 class="text-base font-semibold">放心购物</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">流程清晰，保障交易，购物每一步都更踏实。</p>
                </article>
                <article class="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
                    <h2 class="text-base font-semibold">售后帮助</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">问题可查，服务可达，需要时随时找到对应帮助。</p>
                </article>
            </section>
        </main>

        <footer class="border-t border-slate-200/80 py-6 text-sm text-slate-500">
            © {{ date('Y') }} ERP Global
        </footer>
    </div>
</div>
@endsection
