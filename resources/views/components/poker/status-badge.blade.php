@props([
    'participant',
])

@if($participant['is_spectator'])
    <flux:badge color="zinc" size="sm" class="mt-1">{{ __('app.spectator') }}</flux:badge>
@elseif($participant['is_online'])
    <flux:badge color="green" size="sm" class="mt-1">{{ __('app.online_status') }}</flux:badge>
@else
    <flux:badge color="zinc" size="sm" class="mt-1">{{ __('app.offline') }}</flux:badge>
@endif
