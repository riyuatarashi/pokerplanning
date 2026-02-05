<?php

namespace App\Auth;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * A simple session-based user for broadcasting authentication.
 * This allows presence channels to work without traditional authentication.
 */
class SessionUser implements Authenticatable
{
    public function __construct(
        public string $sessionId
    ) {}

    public function getAuthIdentifierName(): string
    {
        return 'session_id';
    }

    public function getAuthIdentifier(): string
    {
        return $this->sessionId;
    }

    public function getAuthPassword(): string
    {
        return '';
    }

    public function getAuthPasswordName(): string
    {
        return '';
    }

    public function getRememberToken(): ?string
    {
        return null;
    }

    public function setRememberToken($value): void
    {
        // Not used
    }

    public function getRememberTokenName(): string
    {
        return '';
    }
}
