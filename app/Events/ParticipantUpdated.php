<?php

namespace App\Events;

use App\Models\Participant;
use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Room $room,
        public Participant $participant,
        public bool $hasVoted = false
    ) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('room.'.$this->room->slug),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'participant' => [
                'id' => $this->participant->id,
                'name' => $this->participant->name,
                'is_spectator' => $this->participant->is_spectator,
                'has_voted' => $this->hasVoted,
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'participant.updated';
    }
}
