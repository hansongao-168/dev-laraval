@extends('front.layout')

@section('title', '商城 · ERP Global')

@section('content')
<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
    <p class="text-sm font-semibold text-teal-700">ERP Global</p>
    <h1 class="mt-6 text-3xl font-semibold tracking-tight">商城</h1>
    <p class="mt-3 text-slate-600">商城接入中</p>
    <a href="{{ route('home') }}" class="mt-8 text-sm font-medium text-teal-700 hover:underline">返回首页</a>
</div>
@endsection
