<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'front.home')->name('home');
Route::view('/storefront', 'front.storefront-placeholder')->name('storefront');
