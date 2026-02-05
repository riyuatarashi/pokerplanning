<?php

namespace App\Events;

use App\Models\Participant;
use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantJoined implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public Room $room,
        public Participant $participant
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
                'is_online' => true,
                'has_voted' => false,
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'participant.joined';
    }
}
