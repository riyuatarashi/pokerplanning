@props([
    'story',
])

<div class="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
    <div class="flex-1 min-w-0">
        <div class="font-medium truncate">{{ $story['title'] }}</div>
        <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ $story['votes_count'] }} {{ $story['votes_count'] === 1 ? __('app.vote') : __('app.votes') }}
            @if($story['estimated_at'])
                &middot; {{ $story['estimated_at'] }}
            @endif
        </div>
    </div>
    <div class="flex items-center gap-3 ml-4">
        @if($story['final_estimate'])
            <flux:badge color="green" size="lg">{{ $story['final_estimate'] }}</flux:badge>
        @else
            <flux:badge color="zinc" size="lg">{{ __('app.no_estimate') }}</flux:badge>
        @endif
        <flux:tooltip :content="__('app.re_estimate')">
            <flux:button
                wire:click="reopenStory({{ $story['id'] }})"
                variant="ghost"
                size="sm"
                icon="arrow-path"
            />
        </flux:tooltip>
    </div>
</div>
