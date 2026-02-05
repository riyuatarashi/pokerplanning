<?php

use App\Auth\SessionUser;
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
// Using 'broadcasting' guard allows session-based auth without login
Broadcast::channel('presence-room.{slug}', function (SessionUser $user, string $slug) {
    $participant = Participant::whereHas('room', fn ($q) => $q->where('slug', $slug))
        ->where('session_id', $user->sessionId)
        ->first();

    if ($participant) {
        // Update last seen timestamp
        $participant->updateLastSeen();

        return [
            'id' => $participant->id,
            'name' => $participant->name,
            'is_spectator' => $participant->is_spectator,
        ];
    }

    return false;
}, ['guards' => ['broadcasting']]);
