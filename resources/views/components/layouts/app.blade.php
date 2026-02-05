<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark" xmlns:flux="http://www.w3.org/1999/html">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $title ?? __('app.app_name') }}</title>

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600&display=swap" rel="stylesheet" />

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @fluxAppearance
</head>
<body class="flex min-h-screen bg-white dark:bg-zinc-800 antialiased">
    <flux:sidebar sticky collapsible="mobile" class="bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700">
        <flux:sidebar.header>
            <flux:brand href="/" name="{{ __('app.app_name') }}" logo="https://api.iconify.design/heroicons:hand-raised.svg?color=%236366f1" class="px-2 dark:hidden" />
            <flux:brand href="/" name="{{ __('app.app_name') }}" logo="https://api.iconify.design/heroicons:hand-raised.svg?color=%23818cf8" class="px-2 hidden dark:flex" />

            <flux:sidebar.collapse class="lg:hidden"/>
        </flux:sidebar.header>

        <flux:sidebar.nav>
            <flux:sidebar.item icon="home" href="/" wire:navigate :current="request()->is('/')">
                {{ __('app.home') }}
            </flux:sidebar.item>

            @if(session('recent_rooms') && count(session('recent_rooms')) > 0)
                <flux:sidebar.group expandable :heading="__('app.recent_rooms')">
                    @foreach(array_reverse(session('recent_rooms', [])) as $recentRoom)
                        <flux:sidebar.item href="{{ route('room', $recentRoom['slug']) }}" wire:navigate>
                            {{ Str::limit($recentRoom['name'], 20) }}
                        </flux:sidebar.item>
                    @endforeach
                </flux:sidebar.group>
            @endif
        </flux:sidebar.nav>

        <flux:sidebar.spacer />

        <flux:sidebar.nav variant="outline">
            <flux:sidebar.group expandable expanded="false" heading="{{ strtoupper(app()->getLocale()) }}" icon="language">
                <flux:sidebar.item href="{{ route('locale.switch', 'en') }}" :current="app()->getLocale() === 'en'">
                    English
                </flux:sidebar.item>
                <flux:sidebar.item href="{{ route('locale.switch', 'fr') }}" :current="app()->getLocale() === 'fr'">
                    Français
                </flux:sidebar.item>
            </flux:sidebar.group>

            <flux:sidebar.item icon="sun" class="dark:hidden" x-on:click="$flux.dark = true">
                {{ __('app.dark_mode') }}
            </flux:sidebar.item>
            <flux:sidebar.item icon="moon" class="hidden dark:flex" x-on:click="$flux.dark = false">
                {{ __('app.light_mode') }}
            </flux:sidebar.item>
        </flux:sidebar.nav>

        <flux:separator />
        <livewire:user-profile />
    </flux:sidebar>

    <flux:header class="lg:hidden">
        <flux:sidebar.toggle class="lg:hidden" icon="bars-2" inset="left" />

        <flux:spacer />

        <livewire:user-profile />
    </flux:header>

    <flux:main container class="max-w-xl lg:max-w-3xl">
        {{ $slot }}
    </flux:main>

    @persist('toast')
        <flux:toast />
    @endpersist

    @fluxScripts
</body>
</html>
