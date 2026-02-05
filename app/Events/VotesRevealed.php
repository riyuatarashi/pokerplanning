<?php

namespace App\Events;

use App\Models\Participant;
use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VotesRevealed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Room $room
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
            'participants' => $this->room->participants()->get()->map(function (Participant $participant) {
                $vote = $participant->votes()
                    ->where('story_id', $this->room->current_story_id)
                    ->first();

                return [
                    'id' => $participant->id,
                    'vote' => $vote?->value,
                ];
            })->toArray(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'votes.revealed';
    }
}
