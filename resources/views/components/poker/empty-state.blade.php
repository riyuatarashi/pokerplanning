@props([
    'icon' => 'document-text',
    'message',
])

<div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
    <flux:icon :name="$icon" class="w-8 h-8 mx-auto mb-2 text-zinc-400" />
    <flux:text class="text-zinc-500 dark:text-zinc-400">{{ $message }}</flux:text>
</div>
