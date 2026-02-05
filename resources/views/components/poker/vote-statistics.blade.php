@props([
    'stats',
])

@if(!empty($stats))
    <flux:separator class="my-6" />

    <flux:heading size="md" class="mb-4">{{ __('app.results') }}</flux:heading>
    <div class="flex flex-wrap gap-3">
        @if($stats['consensus'])
            <flux:badge color="green" size="lg" icon="check-circle">
                {{ __('app.consensus_label', ['value' => $stats['average']]) }}
            </flux:badge>
        @else
            <flux:badge color="amber" size="lg" icon="calculator">
                {{ __('app.average', ['value' => $stats['average']]) }}
            </flux:badge>
            <flux:badge color="zinc" size="lg" icon="arrows-right-left">
                {{ __('app.range', ['min' => $stats['min'], 'max' => $stats['max']]) }}
            </flux:badge>
        @endif
    </div>
@endif
