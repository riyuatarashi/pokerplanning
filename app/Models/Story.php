<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $room_id
 * @property string $title
 * @property string|null $final_estimate
 * @property string $status
 * @property \Carbon\Carbon|null $estimated_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Story extends Model
{
    protected $fillable = [
        'room_id',
        'title',
        'final_estimate',
        'status',
        'estimated_at',
    ];

    protected $casts = [
        'estimated_at' => 'datetime',
    ];

    /**
     * @return HasMany<Vote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
