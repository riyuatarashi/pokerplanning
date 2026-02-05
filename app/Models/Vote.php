<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $room_id
 * @property int $participant_id
 * @property int|null $story_id
 * @property string|null $value
 */
class Vote extends Model
{
    protected $fillable = [
        'room_id',
        'participant_id',
        'story_id',
        'value',
    ];

    /**
     * @return BelongsTo<Participant, $this>
     */
    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }
}
