@props([
    'value',
    'selected' => false,
    'disabled' => false,
])

<flux:tooltip :content="$disabled ? __('app.votes_revealed') : __('app.vote_card', ['value' => $value])" position="top">
    <button
        {{ $attributes }}
        @class([
            'relative w-16 h-24 rounded-lg border-2 font-bold text-lg transition-all duration-200',
            'bg-white dark:bg-zinc-800 hover:scale-105 hover:shadow-lg',
            'border-primary-500 ring-2 ring-primary-500 scale-105 shadow-lg' => $selected,
            'border-zinc-300 dark:border-zinc-600' => !$selected,
            'opacity-50 cursor-not-allowed' => $disabled,
        ])
        @disabled($disabled)
    >
        @if($value === 'coffee')
            <span class="text-2xl">&#9749;</span>
        @else
            {{ $value }}
        @endif
    </button>
</flux:tooltip>
