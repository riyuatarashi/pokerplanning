<?php

use App\Events\ParticipantJoined;
use App\Events\ParticipantUpdated;
use App\Events\RoomRenamed;
use App\Events\StoryChanged;
use App\Events\StoryCompleted;
use App\Events\VoteCast;
use App\Events\VoteCleared;
use App\Events\VotesReset;
use App\Events\VotesRevealed;
use App\Models\Participant;
use App\Models\Room;
use App\Models\Story;
use App\Models\Vote;
use Flux\Flux;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Support\Facades\Cookie;
use Livewire\Attributes\Session;
use Livewire\Volt\Component;

new class extends Component {
    public Room $room;
    public ?Participant $participant = null;

    public string $participantName = '';

    public bool $isSpectator = false;
    public string $currentStory = '';
    public ?string $selectedCard = null;
    public string $roomName = '';

    /** @var array<string> */
    public array $cardSequence = [];

    /** @var array<int, array{id: int, name: string, is_spectator: bool, is_online: bool, has_voted: bool, vote: string|null}> */
    public array $participants = [];
    public bool $votesRevealed = false;

    /** @var array<int, array{id: int, title: string, final_estimate: string|null, estimated_at: string|null, votes_count: int}> */
    public array $completedStories = [];
    public string $storyPlaceholder = '';

    /**
     * @var array<string, array{name: string, slug: string}>
     */
    #[Session(key: 'recent_rooms')]
    public array $recentRooms = [];

    public function mount(string $slug): void
    {
        $this->room = Room::where('slug', $slug)->firstOrFail();
        $this->roomName = $this->room->name;
        $this->votesRevealed = $this->room->votes_revealed;
        $this->cardSequence = $this->room->card_sequence;
        $this->storyPlaceholder = $this->getRandomStorySuggestion();

        // Load participant name from cookie
        $savedName = request()->cookie('participant_name', '');
        $this->participantName = is_string($savedName) ? $savedName : '';

        // Load current story from Story model
        $currentStoryModel = $this->room->currentStoryModel;
        $this->currentStory = $currentStoryModel?->title ?? '';

        // Check if participant exists in session
        $sessionId = session()->getId();
        $this->participant = Participant::query()
            ->where('session_id', $sessionId)
            ->where('room_id', $this->room->id)
            ->first();

        if ($this->participant) {
            $this->participantName = $this->participant->name;
            $this->isSpectator = $this->participant->is_spectator;

            // Get current vote
            if ($this->room->current_story_id) {
                $currentVote = $this->participant->votes()
                    ->where('story_id', $this->room->current_story_id)
                    ->first();
                $this->selectedCard = $currentVote?->value;
            }
        } elseif ($this->participantName !== '') {
            // Auto-join if participant name is already in cookie
            $this->autoJoinRoom();
        }

        $this->loadParticipants();
        $this->loadCompletedStories();

        // Store in recent rooms
        $this->recentRooms[$this->room->slug] = [
            'name' => $this->room->name,
            'slug' => $this->room->slug,
        ];
    }

    public function joinRoom(): void
    {
        $this->validate([
            'participantName' => ['required', 'min:2', 'max:50'],
        ]);

        // Check if name is already taken in this room
        $existingParticipant = Participant::query()
            ->where('room_id', $this->room->id)
            ->where('name', $this->participantName)
            ->first();

        if ($existingParticipant) {
            $this->participantName .= ' ' . __('app.name_taken_suffix');
        }

        // Save name to cookie for 1 year
        Cookie::queue('participant_name', $this->participantName, 60 * 24 * 365);

        $this->participant = Participant::createOrFirst(
            [
                'room_id'    => $this->room->id,
                'name'       => $this->participantName,
                'session_id' => session()->getId(),
            ], [
                'is_spectator' => $this->isSpectator,
                'last_seen_at' => now(),
            ]
        );

        Flux::toast(
            text   : $this->isSpectator ? __('app.joined_as_spectator') : __('app.can_now_vote'),
            heading: __('app.joined_room'),
            variant: 'success',
        );

        $this->loadParticipants();
        $this->broadcastToOthers(new ParticipantJoined($this->room, $this->participant));
    }

    protected function autoJoinRoom(): void
    {
        // Check if name is already taken in this room
        $existingParticipant = Participant::query()
            ->where('room_id', $this->room->id)
            ->where('name', $this->participantName)
            ->first();

        if ($existingParticipant) {
            $this->participantName .= ' ' . __('app.name_taken_suffix');
        }

        $this->participant = Participant::createOrFirst(
            [
                'room_id'    => $this->room->id,
                'name'       => $this->participantName,
                'session_id' => session()->getId(),
            ], [
                'is_spectator' => false,
                'last_seen_at' => now(),
            ]
        );

        $this->broadcastToOthers(new ParticipantJoined($this->room, $this->participant));
    }

    public function selectCard(string $value): void
    {
        if (! $this->participant || $this->isSpectator || $this->votesRevealed) {
            return;
        }

        if (! $this->room->current_story_id) {
            return;
        }

        $this->selectedCard = $value;

        Vote::updateOrCreate(
            [
                'room_id'        => $this->room->id,
                'participant_id' => $this->participant->id,
                'story_id'       => $this->room->current_story_id,
            ],
            ['value' => $value]
        );

        $this->loadParticipants();
        $this->broadcastToOthers(new VoteCast($this->room, $this->participant->id));
    }

    public function clearVote(): void
    {
        if (! $this->participant || $this->votesRevealed) {
            return;
        }

        Vote::query()
            ->where('room_id', $this->room->id)
            ->where('participant_id', $this->participant->id)
            ->where('story_id', $this->room->current_story_id)
            ->delete();

        $this->selectedCard = null;
        $this->loadParticipants();
        $this->broadcastToOthers(new VoteCleared($this->room, $this->participant->id));
    }

    public function revealVotes(): void
    {
        $this->room->update(['votes_revealed' => true]);

        // Update story status to revealed
        if ($this->room->current_story_id) {
            Story::where('id', $this->room->current_story_id)->update(['status' => 'revealed']);
        }

        $this->votesRevealed = true;
        $this->loadParticipants();
        $this->broadcastToOthers(new VotesRevealed($this->room));

        $stats = $this->getVoteStatistics();
        if (! empty($stats) && $stats['consensus']) {
            Flux::toast(
                text   : __('app.consensus_text', ['value' => $stats['average']]),
                heading: __('app.consensus'),
                variant: 'success',
            );
        }
    }

    public function resetVotes(): void
    {
        $storyId = $this->room->current_story_id;

        // Delete votes for current story
        if ($storyId) {
            Vote::where('story_id', $storyId)->delete();
            Story::where('id', $storyId)->update(['status' => 'voting']);
        }

        $this->room->update(['votes_revealed' => false]);
        $this->votesRevealed = false;
        $this->selectedCard = null;
        $this->loadParticipants();

        if ($storyId) {
            $this->broadcastToOthers(new VotesReset($this->room, $storyId));
        }
    }

    public function updateStory(): void
    {
        $title = trim($this->currentStory);

        if ($title === '') {
            // If empty, just clear current story
            $this->room->update([
                'current_story_id' => null,
                'current_story'    => null,
                'votes_revealed'   => false,
            ]);
            $this->votesRevealed = false;
            $this->selectedCard = null;
            $this->loadParticipants();
            $this->loadCompletedStories();
            $this->broadcastToOthers(new StoryChanged($this->room, null));

            return;
        }

        $story = Story::query()
            ->where('status', '!=', 'completed')
            ->createOrFirst(
                [
                    'room_id' => $this->room->id,
                    'title'   => $title,
                ],
                [
                    'status' => 'voting',
                ]
            );

        $this->room->update([
            'current_story_id' => $story->id,
            'current_story'    => $title,
            'votes_revealed'   => false,
        ]);

        $this->votesRevealed = false;
        $this->selectedCard = null;
        $this->loadParticipants();
        $this->loadCompletedStories();
        $this->broadcastToOthers(new StoryChanged($this->room, $story));
    }

    public function clearStory(): void
    {
        $this->currentStory = '';
        $this->updateStory();
    }

    public function nextStory(): void
    {
        $completedStory = null;

        // Complete the current story with the final estimate
        if ($this->room->current_story_id) {
            $story = Story::find($this->room->current_story_id);
            if ($story) {
                $stats = $this->getVoteStatistics();
                $finalEstimate = null;

                if (! empty($stats)) {
                    $finalEstimate = (string) $stats['average'];
                }

                $story->update([
                    'status'         => 'completed',
                    'final_estimate' => $finalEstimate,
                    'estimated_at'   => now(),
                ]);

                $completedStory = $story;
            }
        }

        // Clear for next story
        $this->currentStory = '';
        $this->room->update([
            'current_story_id' => null,
            'current_story'    => null,
            'votes_revealed'   => false,
        ]);

        $this->votesRevealed = false;
        $this->selectedCard = null;
        $this->loadParticipants();
        $this->loadCompletedStories();

        if ($completedStory) {
            $this->broadcastToOthers(new StoryCompleted($this->room, $completedStory));
        }

        Flux::toast(__('app.story_saved'));
    }

    public function reopenStory(int $storyId): void
    {
        $story = Story::query()
            ->where('id', $storyId)
            ->where('room_id', $this->room->id)
            ->first();

        if (! $story) {
            return;
        }

        // Mark as voting again
        $story->update([
            'status'         => 'voting',
            'final_estimate' => null,
            'estimated_at'   => null,
        ]);

        // Set as current story
        $this->currentStory = $story->title;
        $this->room->update([
            'current_story_id' => $story->id,
            'current_story'    => $story->title,
            'votes_revealed'   => false,
        ]);

        // Get existing vote for this participant
        if ($this->participant) {
            $existingVote = Vote::query()
                ->where('story_id', $story->id)
                ->where('participant_id', $this->participant->id)
                ->first();
            $this->selectedCard = $existingVote?->value;
        }

        $this->votesRevealed = false;
        $this->loadParticipants();
        $this->loadCompletedStories();
        $this->broadcastToOthers(new StoryChanged($this->room, $story));

        Flux::toast(__('app.story_reopened'));
    }

    public function toggleSpectator(): void
    {
        if (! $this->participant) {
            return;
        }

        $this->isSpectator = ! $this->isSpectator;
        $this->participant->update(['is_spectator' => $this->isSpectator]);

        $hasVoted = false;
        if ($this->isSpectator) {
            Vote::query()
                ->where('room_id', $this->room->id)
                ->where('participant_id', $this->participant->id)
                ->where('story_id', $this->room->current_story_id)
                ->delete();
            $this->selectedCard = null;

            Flux::toast(__('app.now_spectating'));
        } else {
            // Check if participant has a vote for current story
            if ($this->room->current_story_id) {
                $hasVoted = Vote::query()
                    ->where('room_id', $this->room->id)
                    ->where('participant_id', $this->participant->id)
                    ->where('story_id', $this->room->current_story_id)
                    ->exists();
            }
            Flux::toast(__('app.can_now_vote'));
        }

        $this->loadParticipants();
        $this->broadcastToOthers(new ParticipantUpdated($this->room, $this->participant, $hasVoted));
    }

    public function updateName(): void
    {
        $this->validate([
            'participantName' => ['required', 'min:2', 'max:50'],
        ]);

        if ($this->participant) {
            // Check if name is already taken by another participant in this room
            $existingParticipant = Participant::query()
                ->where('room_id', $this->room->id)
                ->where('name', $this->participantName)
                ->where('id', '!=', $this->participant->id)
                ->first();

            if ($existingParticipant) {
                $this->participantName .= ' ' . __('app.name_taken_suffix');
            }

            $this->participant->update(['name' => $this->participantName]);

            // Save name to cookie for 1 year
            Cookie::queue('participant_name', $this->participantName, 60 * 24 * 365);

            // Check if participant has a vote for current story
            $hasVoted = false;
            if ($this->room->current_story_id) {
                $hasVoted = Vote::query()
                    ->where('room_id', $this->room->id)
                    ->where('participant_id', $this->participant->id)
                    ->where('story_id', $this->room->current_story_id)
                    ->exists();
            }

            $this->loadParticipants();
            $this->broadcastToOthers(new ParticipantUpdated($this->room, $this->participant, $hasVoted));
            Flux::toast(__('app.name_updated'));
        }

        Flux::modal('edit-name')->close();
    }

    public function updateRoomName(): void
    {
        $this->validate([
            'roomName' => ['required', 'min:3', 'max:255'],
        ]);

        $this->room->update(['name' => $this->roomName]);

        // Update recent rooms session
        $this->recentRooms[$this->room->slug] = [
            'name' => $this->roomName,
            'slug' => $this->room->slug,
        ];

        $this->broadcastToOthers(new RoomRenamed($this->room));
        Flux::toast(__('app.room_name_updated'));
        Flux::modal('edit-room-name')->close();
    }

    public function copyLink(): void
    {
        Flux::toast(
            text   : __('app.link_copied_text'),
            heading: __('app.link_copied'),
            variant: 'success',
        );
    }

    /**
     * Called when presence channel reports current members (on join)
     *
     * @param  array<int, array{id: int, name: string, is_spectator: bool}>  $members
     */
    public function presenceHere(array $members): void
    {
        $onlineIds = collect($members)->pluck('id')->toArray();
        $this->updateOnlineStatus($onlineIds);
    }

    /**
     * Called when a new member joins the presence channel
     *
     * @param  array{id: int, name: string, is_spectator: bool}  $member
     */
    public function presenceJoining(array $member): void
    {
        // Reload participants to get the new member
        $this->loadParticipants();

        // Mark them as online
        $this->participants = array_map(function ($p) use ($member) {
            if ($p['id'] === $member['id']) {
                $p['is_online'] = true;
            }

            return $p;
        }, $this->participants);
    }

    /**
     * Called when a member leaves the presence channel
     *
     * @param  array{id: int, name: string, is_spectator: bool}  $member
     */
    public function presenceLeaving(array $member): void
    {
        // Mark them as offline
        $this->participants = array_map(function ($p) use ($member) {
            if ($p['id'] === $member['id']) {
                $p['is_online'] = false;
            }

            return $p;
        }, $this->participants);
    }

    /**
     * Update online status based on presence channel members
     *
     * @param  array<int>  $onlineIds
     */
    protected function updateOnlineStatus(array $onlineIds): void
    {
        $this->participants = array_map(function ($p) use ($onlineIds) {
            $p['is_online'] = in_array($p['id'], $onlineIds);

            return $p;
        }, $this->participants);
    }

    /**
     * @return array<string, string>
     */
    public function getListeners(): array
    {
        return [
            "echo:room.{$this->room->slug},.participant.joined"  => 'onParticipantJoined',
            "echo:room.{$this->room->slug},.participant.updated" => 'onParticipantUpdated',
            "echo:room.{$this->room->slug},.vote.cast"           => 'onVoteCast',
            "echo:room.{$this->room->slug},.vote.cleared"        => 'onVoteCleared',
            "echo:room.{$this->room->slug},.votes.revealed"      => 'onVotesRevealed',
            "echo:room.{$this->room->slug},.votes.reset"         => 'onVotesReset',
            "echo:room.{$this->room->slug},.story.changed"       => 'onStoryChanged',
            "echo:room.{$this->room->slug},.story.completed"     => 'onStoryCompleted',
            "echo:room.{$this->room->slug},.room.renamed"        => 'onRoomRenamed',
        ];
    }

    /**
     * @param  array{participant: array{id: int, name: string, is_spectator: bool, is_online: bool, has_voted: bool}}  $event
     */
    public function onParticipantJoined(array $event): void
    {
        $this->participants[] = $event['participant'];
    }

    /**
     * @param  array{participant: array{id: int, name: string, is_spectator: bool, has_voted: bool}}  $event
     */
    public function onParticipantUpdated(array $event): void
    {
        $this->participants = array_map(function ($participant) use ($event) {
            if ($participant['id'] === $event['participant']['id']) {
                $participant['name'] = $event['participant']['name'];
                $participant['is_spectator'] = $event['participant']['is_spectator'];
                $participant['has_voted'] = $event['participant']['has_voted'];
            }

            return $participant;
        }, $this->participants);
    }

    /**
     * @param  array{participant_id: int}  $event
     */
    public function onVoteCast(array $event): void
    {
        $this->participants = array_map(function ($participant) use ($event) {
            if ($participant['id'] === $event['participant_id']) {
                $participant['has_voted'] = true;
            }

            return $participant;
        }, $this->participants);
    }

    /**
     * @param  array{participant_id: int}  $event
     */
    public function onVoteCleared(array $event): void
    {
        $this->participants = array_map(function ($participant) use ($event) {
            if ($participant['id'] === $event['participant_id']) {
                $participant['has_voted'] = false;
            }

            return $participant;
        }, $this->participants);
    }

    /**
     * @param  array{participants: array<int, array{id: int, vote: string|null}>}  $event
     */
    public function onVotesRevealed(array $event): void
    {
        $this->votesRevealed = true;

        // Merge vote values into participants
        foreach ($event['participants'] as $voted) {
            $this->participants = array_map(function ($participant) use ($voted) {
                if ($participant['id'] === $voted['id']) {
                    $participant['vote'] = $voted['vote'];
                }

                return $participant;
            }, $this->participants);
        }
    }

    /**
     * @param  array{story_id: int}  $event
     */
    public function onVotesReset(array $event): void
    {
        unset($event); // Not used but kept for signature consistency

        $this->votesRevealed = false;
        $this->selectedCard = null;

        // Clear all vote states
        $this->participants = array_map(function ($participant) {
            $participant['has_voted'] = false;
            $participant['vote'] = null;

            return $participant;
        }, $this->participants);
    }

    /**
     * @param  array{story: array{id: int|null, title: string|null}, participants: array<int, array{id: int, has_voted: bool}>, completed_stories: array<int, array{id: int, title: string, final_estimate: string|null, estimated_at: string|null, votes_count: int}>}  $event
     */
    public function onStoryChanged(array $event): void
    {
        $this->currentStory = $event['story']['title'] ?? '';
        $this->room->refresh();
        $this->votesRevealed = false;

        // Merge has_voted status into participants
        foreach ($event['participants'] as $eventParticipant) {
            $this->participants = array_map(function ($participant) use ($eventParticipant) {
                if ($participant['id'] === $eventParticipant['id']) {
                    $participant['has_voted'] = $eventParticipant['has_voted'];
                    $participant['vote'] = null; // Reset vote display
                }

                return $participant;
            }, $this->participants);
        }

        // Update completed stories
        $this->completedStories = $event['completed_stories'];

        // Load own vote if story has existing votes (reopen case)
        if ($this->participant && $event['story']['id']) {
            $vote = Vote::where('story_id', $event['story']['id'])
                ->where('participant_id', $this->participant->id)
                ->first();

            $this->selectedCard = $vote?->value;
        } else {
            $this->selectedCard = null;
        }
    }

    /**
     * @param  array{completed_story: array{id: int, title: string, final_estimate: string|null, estimated_at: string|null, votes_count: int}}  $event
     */
    public function onStoryCompleted(array $event): void
    {
        // Add to history (prepend - newest first)
        array_unshift($this->completedStories, $event['completed_story']);

        // Clear current story state
        $this->currentStory = '';
        $this->votesRevealed = false;
        $this->selectedCard = null;
        $this->room->refresh();

        // Clear vote status for all participants
        $this->participants = array_map(function ($participant) {
            $participant['has_voted'] = false;
            $participant['vote'] = null;

            return $participant;
        }, $this->participants);
    }

    /**
     * @param  array{name: string}  $event
     */
    public function onRoomRenamed(array $event): void
    {
        $this->roomName = $event['name'];
        $this->room->refresh();
    }

    protected function loadParticipants(): void
    {
        $this->participants = $this->room->participants()
            ->get()
            ->map(function ($participant) {
                $vote = null;
                if ($this->room->current_story_id) {
                    $vote = $participant->votes()
                        ->where('story_id', $this->room->current_story_id)
                        ->first();
                }

                return [
                    'id'           => $participant->id,
                    'name'         => $participant->name,
                    'is_spectator' => $participant->is_spectator,
                    'is_online'    => $participant->isOnline(),
                    'has_voted'    => $vote !== null,
                    'vote'         => $this->votesRevealed ? $vote?->value : null,
                ];
            })
            ->toArray();
    }

    protected function loadCompletedStories(): void
    {
        $this->completedStories = $this->room->completedStories()
            ->with('votes.participant')
            ->get()
            ->map(function ($story) {
                return [
                    'id'             => $story->id,
                    'title'          => $story->title,
                    'final_estimate' => $story->final_estimate,
                    'estimated_at'   => $story->estimated_at?->diffForHumans(),
                    'votes_count'    => $story->votes->count(),
                ];
            })
            ->toArray();
    }

    protected function getRandomStorySuggestion(): string
    {
        /** @var array<string> $suggestions */
        $suggestions = __('app.story_suggestions');

        return $suggestions[array_rand($suggestions)];
    }

    public function useRandomStory(): void
    {
        $this->currentStory = $this->getRandomStorySuggestion();
        $this->updateStory();
        $this->storyPlaceholder = $this->getRandomStorySuggestion();
    }

    public function hasActiveStory(): bool
    {
        return $this->room->current_story_id !== null;
    }

    protected function broadcastToOthers(ShouldBroadcast $event): void
    {
        $socketId = request()->header('X-Socket-ID');

        if ($socketId && $socketId !== 'undefined') {
            broadcast($event)->toOthers();
        } else {
            broadcast($event);
        }
    }

    /**
     * @return array{average: float, min: float, max: float, consensus: bool}|array{}
     */
    public function getVoteStatistics(): array
    {
        if (! $this->votesRevealed) {
            return [];
        }

        $votes = collect($this->participants)
            ->filter(fn($participant) => ! $participant['is_spectator'] && $participant['vote'] !== null)
            ->pluck('vote')
            ->filter(fn($vote) => is_numeric($vote))
            ->map(fn($vote) => (float) $vote);

        if ($votes->isEmpty()) {
            return [];
        }

        return [
            'average'   => round($votes->avg(), 1),
            'min'       => $votes->min(),
            'max'       => $votes->max(),
            'consensus' => $votes->unique()->count() === 1,
        ];
    }
}; ?>

<div
        x-data="{
        presenceChannel: null,
        init() {
            @if($participant)
                this.joinPresenceChannel();
            @endif
        },
        joinPresenceChannel() {
            if (this.presenceChannel) {
                this.presenceChannel.unsubscribe();
            }

            this.presenceChannel = window.Echo.join('presence-room.{{ $room->slug }}')
                .here((members) => {
                    // Extract only needed properties to avoid Livewire serialization issues with Pusher objects
                    const cleanMembers = members.map(member => ({ id: member.id, name: member.name, is_spectator: member.is_spectator }));
                    $wire.presenceHere(cleanMembers);
                })
                .joining((member) => {
                    $wire.presenceJoining({ id: member.id, name: member.name, is_spectator: member.is_spectator });
                })
                .leaving((member) => {
                    $wire.presenceLeaving({ id: member.id, name: member.name, is_spectator: member.is_spectator });
                })
                .error((error) => {
                    console.warn('Presence channel auth failed:', error);
                    // Fallback: rely on last_seen_at for online status
                });
        },
        destroy() {
            if (this.presenceChannel) {
                this.presenceChannel.unsubscribe();
            }
        }
    }"
        x-on:participant-joined.window="joinPresenceChannel()"
>
    @if(!$participant)
        <!-- Join Form -->
        <div class="max-w-md mx-auto">
            <flux:card class="space-y-6">
                <div>
                    <flux:heading size="lg">{{ __('app.join_room_title', ['name' => $room->name]) }}</flux:heading>
                    <flux:text class="mt-1">{{ __('app.join_room_subtitle') }}</flux:text>
                </div>

                <form wire:submit="joinRoom" class="space-y-4">
                    <flux:input
                            wire:model="participantName"
                            :label="__('app.your_name')"
                            :placeholder="__('app.your_name_placeholder')"
                            icon="user"
                            autofocus
                    />

                    <flux:switch
                            wire:model="isSpectator"
                            :label="__('app.join_as_spectator')"
                            :description="__('app.spectator_description')"
                    />

                    <flux:button type="submit" variant="primary" class="w-full" icon="arrow-right-end-on-rectangle">
                        {{ __('app.join_room') }}
                    </flux:button>
                </form>
            </flux:card>
        </div>
    @else
        <div class="space-y-6">
            <!-- Room Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <flux:tooltip :content="__('app.edit_room_name')">
                        <button
                                type="button"
                                x-on:click="$flux.modal('edit-room-name').show()"
                                class="group flex items-center gap-2 text-left"
                        >
                            <flux:heading size="xl">{{ $room->name }}</flux:heading>
                            <flux:icon name="pencil-square" variant="mini"
                                       class="size-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                    </flux:tooltip>
                    <div class="flex items-center gap-2 mt-1">
                        <flux:badge color="zinc" size="sm">{{ $room->slug }}</flux:badge>
                        <flux:tooltip :content="__('app.copy_room_link')">
                            <flux:button
                                    variant="ghost"
                                    size="sm"
                                    icon="clipboard"
                                    wire:click="copyLink"
                                    x-on:click="navigator.clipboard.writeText('{{ route('room', $room->slug) }}')"
                            >
                                {{ __('app.copy_link') }}
                            </flux:button>
                        </flux:tooltip>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <flux:tooltip :content="$isSpectator ? __('app.switch_to_voting') : __('app.switch_to_spectator')">
                        <flux:button
                                wire:click="toggleSpectator"
                                variant="{{ $isSpectator ? 'filled' : 'ghost' }}"
                                size="sm"
                                icon="{{ $isSpectator ? 'eye' : 'hand-raised' }}"
                        >
                            {{ $isSpectator ? __('app.spectating') : __('app.voting') }}
                        </flux:button>
                    </flux:tooltip>
                </div>
            </div>

            <!-- Current Story -->
            <flux:card>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <flux:input
                                wire:model="currentStory"
                                wire:blur="updateStory"
                                wire:keydown.enter="updateStory"
                                :label="__('app.current_story')"
                                :placeholder="$storyPlaceholder"
                                icon="document-text"
                        >
                            @if($currentStory !== '')
                                <x-slot name="iconTrailing">
                                    <flux:button
                                            type="button"
                                            wire:click="clearStory"
                                            variant="subtle"
                                            size="sm"
                                            icon="x-mark"
                                            :aria-label="__('app.clear_story')"
                                            class="-mr-1"
                                    />
                                </x-slot>
                            @endif
                        </flux:input>
                    </div>
                    <div class="flex items-end gap-2">
                        @if(!$this->hasActiveStory() && !$votesRevealed)
                            <flux:tooltip :content="__('app.random_story')">
                                <flux:button wire:click="useRandomStory" variant="ghost" icon="sparkles">
                                    {{ __('app.random') }}
                                </flux:button>
                            </flux:tooltip>
                        @endif
                        @if($votesRevealed)
                            <flux:tooltip :content="__('app.save_and_next')">
                                <flux:button wire:click="nextStory" variant="primary" icon="arrow-right">
                                    {{ __('app.next_story') }}
                                </flux:button>
                            </flux:tooltip>
                        @else
                            <flux:tooltip :content="__('app.show_votes')">
                                <flux:button wire:click="revealVotes" variant="primary" icon="eye"
                                             :disabled="!$this->hasActiveStory()">
                                    {{ __('app.reveal') }}
                                </flux:button>
                            </flux:tooltip>
                        @endif
                        <flux:tooltip :content="__('app.reset_votes')">
                            <flux:button wire:click="resetVotes" variant="ghost" icon="arrow-path"
                                         :disabled="!$this->hasActiveStory()">
                                {{ __('app.reset') }}
                            </flux:button>
                        </flux:tooltip>
                    </div>
                </div>
            </flux:card>

            <!-- Voting Cards -->
            @if(!$isSpectator)
                <div>
                    <flux:heading size="lg" class="mb-4">{{ __('app.your_vote') }}</flux:heading>
                    @if(!$this->hasActiveStory())
                        <x-poker.empty-state :message="__('app.enter_story_to_vote')" />
                    @else
                        <div class="flex flex-wrap gap-3">
                            @foreach($cardSequence as $card)
                                <x-poker.voting-card
                                        :value="$card"
                                        :selected="$selectedCard === $card"
                                        :disabled="$votesRevealed"
                                        wire:click="selectCard('{{ $card }}')"
                                />
                            @endforeach

                            @if($selectedCard && !$votesRevealed)
                                <flux:tooltip :content="__('app.clear_vote')">
                                    <flux:button wire:click="clearVote" variant="ghost" icon="x-mark"
                                                 class="self-center">
                                        {{ __('app.clear') }}
                                    </flux:button>
                                </flux:tooltip>
                            @endif
                        </div>
                    @endif
                </div>
            @endif

            <!-- Participants & Votes -->
            <flux:card>
                <flux:heading size="lg" class="mb-4">
                    {{ __('app.participants') }}
                    <flux:badge color="zinc" size="sm" class="ml-2">
                        {{ count(array_filter($participants, fn($participant) => $participant['is_online'])) }} {{ __('app.online') }}
                    </flux:badge>
                </flux:heading>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    @foreach($participants as $p)
                        <x-poker.participant-card
                                :participant="$p"
                                :votes-revealed="$votesRevealed"
                                :is-current-user="$participant && $p['id'] === $participant->id"
                        />
                    @endforeach
                </div>

                @if($votesRevealed)
                    <x-poker.vote-statistics :stats="$this->getVoteStatistics()" />
                @endif
            </flux:card>

            <!-- History -->
            @if(count($completedStories) > 0)
                <flux:card>
                    <flux:heading size="lg" class="mb-4">
                        {{ __('app.session_history') }}
                        <flux:badge color="zinc" size="sm" class="ml-2">
                            {{ count($completedStories) }} {{ count($completedStories) === 1 ? __('app.story') : __('app.stories') }}
                        </flux:badge>
                    </flux:heading>

                    <div class="space-y-3">
                        @foreach($completedStories as $story)
                            <x-poker.story-history-item :story="$story" />
                        @endforeach
                    </div>
                </flux:card>
            @endif
        </div>

        <!-- Edit Name Modal -->
        <x-poker.modal-form name="edit-name" :title="__('app.edit_name')" wire:submit="updateName">
            <flux:input
                    wire:model="participantName"
                    :label="__('app.new_name')"
                    :placeholder="__('app.your_name_placeholder')"
                    icon="user"
                    autofocus
            />
        </x-poker.modal-form>

        <!-- Edit Room Name Modal -->
        <x-poker.modal-form name="edit-room-name" :title="__('app.edit_room_name')" wire:submit="updateRoomName">
            <flux:input
                    wire:model="roomName"
                    :label="__('app.new_room_name')"
                    :placeholder="__('app.room_name_placeholder')"
                    icon="rectangle-stack"
                    autofocus
            />
        </x-poker.modal-form>
    @endif
</div>
