@props([
    'participant',
    'votesRevealed' => false,
])

<div @class([
    'w-12 h-16 rounded-md border-2 flex items-center justify-center mb-2 font-bold transition-all',
    'bg-primary-100 dark:bg-primary-900 border-primary-500' => $participant['has_voted'] && !$votesRevealed,
    'bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600' => !$participant['has_voted'] && !$votesRevealed,
    'bg-white dark:bg-zinc-700 border-primary-500' => $votesRevealed && $participant['vote'],
])>
    @if($participant['is_spectator'])
        <flux:icon name="eye" variant="mini" class="text-zinc-400" />
    @elseif($votesRevealed && $participant['vote'])
        @if($participant['vote'] === 'coffee')
            <span class="text-xl">&#9749;</span>
        @else
            {{ $participant['vote'] }}
        @endif
    @elseif($participant['has_voted'])
        <flux:icon name="check" variant="mini" class="text-primary-500" />
    @else
        <span class="text-zinc-300">?</span>
    @endif
</div>
