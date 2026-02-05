<?php

use App\Models\Participant;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Presence channel for room - uses session-based identification
Broadcast::channel('presence-room.{slug}', function (mixed $user, string $slug) {
    // Since we don't use authentication, $user may be null
    // We authorize based on session and return participant info
    unset($user); // Not used - app is session-based
    $sessionId = session()->getId();

    $participant = Participant::whereHas('room', fn ($q) => $q->where('slug', $slug))
        ->where('session_id', $sessionId)
        ->first();

    if ($participant) {
        return [
            'id' => $participant->id,
            'name' => $participant->name,
            'is_spectator' => $participant->is_spectator,
        ];
    }

    return false;
});
