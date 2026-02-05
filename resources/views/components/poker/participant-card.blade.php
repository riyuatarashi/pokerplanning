@props([
    'participant',
    'votesRevealed' => false,
    'isCurrentUser' => false,
])

<div @class([
    'flex flex-col items-center p-4 rounded-lg border transition-all',
    'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    'opacity-50' => !$participant['is_online'],
])>
    <x-poker.vote-display
        :participant="$participant"
        :votes-revealed="$votesRevealed"
    />

    <span class="text-sm font-medium truncate max-w-full">
        {{ $participant['name'] }}
        @if($isCurrentUser)
            <flux:tooltip :content="__('app.edit_name')">
                <button
                    type="button"
                    x-on:click="$flux.modal('edit-name').show()"
                    class="text-xs text-zinc-400 hover:text-primary-500 transition-colors"
                >
                    ({{ __('app.you') }})
                </button>
            </flux:tooltip>
        @endif
    </span>

    <x-poker.status-badge :participant="$participant" />
</div>
