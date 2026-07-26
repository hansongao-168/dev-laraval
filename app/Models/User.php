<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use LogicException;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** @var list<string> */
    private const PROTECTED_USER_ALLOWED_ATTRIBUTES = [
        'email',
        'password',
        'status',
        'is_admin',
        'is_super_admin',
    ];

    protected static function booted(): void
    {
        static::updating(function (User $user): void {
            if (! (bool) $user->getRawOriginal('is_protected')) {
                return;
            }

            $disallowedAttributes = array_diff(
                array_keys($user->getDirty()),
                self::PROTECTED_USER_ALLOWED_ATTRIBUTES,
            );

            if ($disallowedAttributes !== []) {
                throw new LogicException('Only the protected administrator email, password, status, and administrator permissions can be modified.');
            }
        });

        static::deleting(function (User $user): void {
            if ($user->is_protected) {
                throw new LogicException('The protected administrator cannot be deleted.');
            }
        });
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_super_admin;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_protected' => 'boolean',
            'is_super_admin' => 'boolean',
            'password' => 'hashed',
        ];
    }
}
