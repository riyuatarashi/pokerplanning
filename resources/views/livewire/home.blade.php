<?php

use App\Models\Room;
use Livewire\Attributes\Session;
use Livewire\Volt\Component;
use Illuminate\Support\Str;
use Faker\Factory as Faker;
use Illuminate\Support\Facades\Cookie;
use Flux\Flux;

new class extends Component {
    public string $roomName = '';
    public string $participantName = '';
    public string $joinRoomSlug = '';
    public string $joinName = '';

    /**
     * @var array<string, array{name: string, slug: string}>
     */
    #[Session(key: 'recent_rooms')]
    public array $recentRooms = [];

    public function mount(): void
    {
        $this->roomName = $this->getDefaultRoomName();

        // Load participant name from cookie
        $savedName = request()->cookie('participant_name', '');
        $this->participantName = is_string($savedName) ? $savedName : '';
        $this->joinName = $this->participantName;
    }

    protected function getDefaultRoomName(): string
    {
        $weekNumber = (int) now()->format('W');
        $sprintNumber = (int) ceil($weekNumber / 2);

        return "Sprint {$sprintNumber} Refinement";
    }

    public function generateRandomRoomName(): void
    {
        $faker = Faker::create(app()->getLocale());
        $this->roomName = ucfirst($faker->words(rand(2, 4), true)) . ' Planning';
    }

    protected function saveParticipantName(string $name): void
    {
        // Save to cookie for 1 year
        Cookie::queue('participant_name', $name, 60 * 24 * 365);
    }

    public function createRoom(): void
    {
        $this->validate([
            'roomName' => ['required', 'min:3', 'max:255'],
            'participantName' => ['required', 'min:2', 'max:50'],
        ]);

        $this->saveParticipantName($this->participantName);

        // Check if room with this name already exists
        $existingRoom = Room::where('name', $this->roomName)->first();

        if ($existingRoom) {
            Flux::toast(
                text: __('app.room_joined_text'),
                heading: __('app.room_joined'),
                variant: 'success',
            );

            $this->redirect(route('room', $existingRoom->slug), navigate: true);

            return;
        }

        $room = Room::create([
            'name' => $this->roomName,
            'slug' => Str::slug($this->roomName) . '-' . Str::random(6),
        ]);

        Flux::toast(
            text: __('app.room_created_text'),
            heading: __('app.room_created'),
            variant: 'success',
        );

        $this->redirect(route('room', $room->slug), navigate: true);
    }

    public function joinRoom(): void
    {
        $this->validate([
            'joinRoomSlug' => ['required'],
            'joinName' => ['required', 'min:2', 'max:50'],
        ]);

        // Support both slug and full URL
        $slug = trim($this->joinRoomSlug);
        if (str_contains($slug, '/')) {
            $slug = basename(parse_url($slug, PHP_URL_PATH));
        }

        $room = Room::where('slug', $slug)->first();

        if (! $room) {
            $this->addError('joinRoomSlug', __('app.room_not_found'));
            Flux::toast(
                text: __('app.room_not_found_text'),
                heading: __('app.room_not_found'),
                variant: 'danger',
            );

            return;
        }

        // Save participant name
        $this->participantName = $this->joinName;
        $this->saveParticipantName($this->participantName);

        $this->redirect(route('room', $room->slug), navigate: true);
    }
}; ?>

<div>
    <flux:heading size="xl">{{ __('app.app_name') }}</flux:heading>
    <flux:subheading>{{ __('app.home_subtitle') }}</flux:subheading>

    <flux:separator variant="subtle" class="my-8" />

    <div class="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <!-- Create Room -->
        <flux:card class="space-y-6">
            <div>
                <flux:heading size="lg">{{ __('app.create_new_room') }}</flux:heading>
                <flux:subheading>{{ __('app.create_room_description') }}</flux:subheading>
            </div>

            <form wire:submit="createRoom" class="space-y-4">
                <flux:input
                    wire:model="roomName"
                    :label="__('app.room_name')"
                    :placeholder="__('app.room_name_placeholder')"
                    icon="rectangle-stack"
                >
                    <x-slot name="iconTrailing">
                        <flux:button
                            type="button"
                            wire:click="generateRandomRoomName"
                            variant="subtle"
                            size="sm"
                            icon="sparkles"
                            :aria-label="__('app.generate_random_name')"
                            class="-mr-1"
                        />
                    </x-slot>
                </flux:input>

                <flux:input
                    wire:model="participantName"
                    :label="__('app.your_name')"
                    :placeholder="__('app.your_name_placeholder')"
                    icon="user"
                />

                <flux:button type="submit" variant="primary" class="w-full" icon="plus">
                    {{ __('app.create_room') }}
                </flux:button>
            </form>
        </flux:card>

        <!-- Join Room -->
        <flux:card class="space-y-6">
            <div>
                <flux:heading size="lg">{{ __('app.join_existing_room') }}</flux:heading>
                <flux:text class="mt-1">{{ __('app.join_room_description') }}</flux:text>
            </div>

            <form wire:submit="joinRoom" class="space-y-4">
                <flux:input
                    wire:model="joinRoomSlug"
                    :label="__('app.room_code_or_link')"
                    :placeholder="__('app.room_code_placeholder')"
                    icon="link"
                />

                <flux:input
                    wire:model="joinName"
                    :label="__('app.your_name')"
                    :placeholder="__('app.your_name_placeholder')"
                    icon="user"
                />

                <flux:button type="submit" variant="primary" class="w-full" icon="arrow-right-end-on-rectangle">
                    {{ __('app.join_room') }}
                </flux:button>
            </form>
        </flux:card>
    </div>

    <!-- Recent Rooms -->
    @if(count($recentRooms) > 0)
        <flux:card class="mt-8 max-w-4xl mx-auto">
            <flux:heading size="lg" class="mb-4">{{ __('app.recent_rooms') }}</flux:heading>
            <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                @foreach(array_reverse($recentRooms) as $recentRoom)
                    <flux:button
                        href="{{ route('room', $recentRoom['slug']) }}"
                        wire:navigate
                        variant="ghost"
                        class="justify-start"
                        icon="arrow-right"
                    >
                        {{ Str::limit($recentRoom['name'], 25) }}
                    </flux:button>
                @endforeach
            </div>
        </flux:card>
    @endif
</div>
