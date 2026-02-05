<?php

namespace App\Events;

use App\Models\Participant;
use App\Models\Room;
use App\Models\Story;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StoryChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Room $room,
        public ?Story $story = null
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
            'story' => [
                'id' => $this->story?->id,
                'title' => $this->story?->title,
            ],
            'participants' => $this->room->participants()->get()->map(function (Participant $participant) {
                $hasVoted = false;
                if ($this->story) {
                    $hasVoted = $participant->votes()
                        ->where('story_id', $this->story->id)
                        ->exists();
                }

                return [
                    'id' => $participant->id,
                    'has_voted' => $hasVoted,
                ];
            })->toArray(),
            'completed_stories' => $this->room->completedStories()
                ->with('votes')
                ->get()
                ->map(function (Story $story) {
                    return [
                        'id' => $story->id,
                        'title' => $story->title,
                        'final_estimate' => $story->final_estimate,
                        'estimated_at' => $story->estimated_at?->diffForHumans(),
                        'votes_count' => $story->votes->count(),
                    ];
                })->toArray(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'story.changed';
    }
}
