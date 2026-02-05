<?php

namespace App\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

/**
 * A guard that returns a session-based user for broadcasting.
 * This allows presence channels to work without traditional authentication.
 */
class SessionGuard implements Guard
{
    protected ?SessionUser $user = null;

    public function __construct(
        protected Request $request
    ) {}

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    public function user(): ?Authenticatable
    {
        if ($this->user !== null) {
            return $this->user;
        }

        // Ensure session is started
        if (! session()->isStarted()) {
            session()->start();
        }

        $sessionId = session()->getId();

        if ($sessionId) {
            $this->user = new SessionUser($sessionId);
        }

        return $this->user;
    }

    public function id(): ?string
    {
        return $this->user()?->getAuthIdentifier();
    }

    public function validate(array $credentials = []): bool
    {
        return false;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    public function setUser(Authenticatable $user): static
    {
        $this->user = $user instanceof SessionUser ? $user : null;

        return $this;
    }
}
