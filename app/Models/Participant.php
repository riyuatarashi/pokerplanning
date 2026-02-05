<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $room_id
 * @property string $name
 * @property string $session_id
 * @property bool $is_spectator
 * @property \Illuminate\Support\Carbon|null $last_seen_at
 * @property-read Room $room
 */
class Participant extends Model
{
    protected $fillable = [
        'room_id',
        'name',
        'session_id',
        'is_spectator',
        'last_seen_at',
    ];

    protected $casts = [
        'is_spectator' => 'boolean',
        'last_seen_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return HasMany<Vote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at && $this->last_seen_at->gte(now()->subMinutes(5));
    }

    public function updateLastSeen(): void
    {
        $this->update(['last_seen_at' => now()]);
    }
}
