<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $current_story
 * @property bool $votes_revealed
 * @property array<string> $card_sequence
 * @property int|null $current_story_id
 * @property Story|null $currentStoryModel
 */
class Room extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'current_story',
        'votes_revealed',
        'card_sequence',
        'current_story_id',
    ];

    protected $casts = [
        'votes_revealed' => 'boolean',
        'card_sequence' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($room) {
            if (empty($room->slug)) {
                $room->slug = Str::slug($room->name).'-'.Str::random(6);
            }
        });
    }

    /**
     * @return HasMany<Participant, $this>
     */
    public function participants(): HasMany
    {
        return $this->hasMany(Participant::class);
    }

    /**
     * @return HasMany<Vote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    /**
     * @return HasMany<Story, $this>
     */
    public function completedStories(): HasMany
    {
        return $this->hasMany(Story::class)->where('status', 'completed')->orderByDesc('estimated_at');
    }

    /**
     * @return BelongsTo<Story, $this>
     */
    public function currentStoryModel(): BelongsTo
    {
        return $this->belongsTo(Story::class, 'current_story_id');
    }
}
