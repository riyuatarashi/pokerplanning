@props([
    'name',
    'title',
    'submitLabel' => __('app.update'),
])

<flux:modal :name="$name" class="max-w-sm">
    <form {{ $attributes }} class="space-y-6">
        <flux:heading size="lg">{{ $title }}</flux:heading>

        {{ $slot }}

        <div class="flex gap-2">
            <flux:button type="button" variant="ghost" x-on:click="$flux.modal('{{ $name }}').close()" class="flex-1">
                {{ __('app.cancel') }}
            </flux:button>
            <flux:button type="submit" variant="primary" class="flex-1">
                {{ $submitLabel }}
            </flux:button>
        </div>
    </form>
</flux:modal>
