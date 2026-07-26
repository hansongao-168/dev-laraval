<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

#[Signature('app:initialize {--force : Run migrations in production without prompting}')]
#[Description('Initialize the database and protected super administrator')]
class InitializeApplication extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        try {
            $this->ensureApplicationKey();

            $this->components->task('Running database migrations', fn (): int => $this->callSilently(
                'migrate',
                ['--force' => $this->option('force') || app()->environment('production')],
            ));

            $this->createProtectedSuperAdministrator();
            $this->callSilently('optimize:clear');
        } catch (Throwable $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->components->info('Application initialized successfully.');
        $this->line('Admin panel: '.url('/admin'));

        return self::SUCCESS;
    }

    private function ensureApplicationKey(): void
    {
        if (filled(config('app.key'))) {
            return;
        }

        $this->components->task(
            'Generating application key',
            fn (): int => $this->callSilently('key:generate', ['--force' => true]),
        );
    }

    private function createProtectedSuperAdministrator(): void
    {
        $credentials = [
            'name' => config('super-admin.name'),
            'email' => config('super-admin.email'),
            'password' => config('super-admin.password'),
        ];

        $validator = Validator::make($credentials, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $protectedUser = User::query()->where('is_protected', true)->first();

        if ($protectedUser) {
            $this->components->info('Protected administrator already exists; no changes were made.');

            return;
        }

        $existingUser = User::query()->where('email', $credentials['email'])->first();

        if ($existingUser) {
            throw new RuntimeException('The configured admin email is already used by an unprotected user.');
        }

        $user = new User([
            ...$credentials,
            'email_verified_at' => now(),
        ]);
        $user->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        $this->components->info('Protected administrator created.');
    }
}
