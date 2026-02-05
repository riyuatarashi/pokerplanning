<?php

use Livewire\Volt\Component;
use Illuminate\Support\Facades\Cookie;
use Flux\Flux;

new class extends Component {
    public string $participantName = '';

    public function mount(): void
    {
        $savedName = request()->cookie('participant_name', '');
        $this->participantName = is_string($savedName) ? $savedName : '';
    }

    public function updateName(): void
    {
        $this->validate([
            'participantName' => ['required', 'min:2', 'max:50'],
        ]);

        // Save name to cookie for 1 year
        Cookie::queue('participant_name', $this->participantName, 60 * 24 * 365);

        Flux::toast(__('app.name_updated'));
        Flux::modal('edit-user-name')->close();
    }
}; ?>

<div>
    @if($participantName !== '')
        <flux:tooltip :content="__('app.click_to_edit')">
            <button
                type="button"
                x-on:click="$flux.modal('edit-user-name').show()"
                class="flex items-center gap-2 p-3 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors w-full text-left"
            >
                <flux:avatar :name="$participantName" color="auto" />
                <span class="truncate">{{ $participantName }}</span>
                <flux:icon name="pencil-square" variant="mini" class="size-3 opacity-50" />
            </button>
        </flux:tooltip>

        <x-poker.modal-form name="edit-user-name" :title="__('app.edit_name')" wire:submit="updateName">
            <flux:input
                wire:model="participantName"
                :label="__('app.new_name')"
                :placeholder="__('app.your_name_placeholder')"
                icon="user"
                autofocus
            />
        </x-poker.modal-form>
    @else
        <div class="p-3 text-sm text-zinc-400 dark:text-zinc-500 italic">
            {{ __('app.not_in_room') }}
        </div>
    @endif
</div>
