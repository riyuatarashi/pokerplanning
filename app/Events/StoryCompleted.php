<?php

namespace App\Events;

use App\Models\Room;
use App\Models\Story;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StoryCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Room $room,
        public Story $story
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
            'completed_story' => [
                'id' => $this->story->id,
                'title' => $this->story->title,
                'final_estimate' => $this->story->final_estimate,
                'estimated_at' => $this->story->estimated_at?->diffForHumans(),
                'votes_count' => $this->story->votes()->count(),
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'story.completed';
    }
}
