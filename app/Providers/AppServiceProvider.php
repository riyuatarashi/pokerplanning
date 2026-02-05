<?php

namespace App\Providers;

use App\Auth\SessionGuard;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register custom session guard for broadcasting
        // This allows presence channels to work without traditional authentication
        Auth::extend('session', function (Application $app, string $name, array $config) {
            return new SessionGuard($app['request']);
        });

        // Register broadcast routes for presence channels
        // Using web middleware for session-based auth (no login required)
        Broadcast::routes(['middleware' => ['web']]);
    }
}
