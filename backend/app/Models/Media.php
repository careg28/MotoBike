<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    protected $fillable = ['original_name','filename','mime','size','disk','path'];
    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        $segments = array_map('rawurlencode', explode('/', ltrim((string) $this->path, '/')));
        return url('/api/media/file/' . implode('/', $segments));
    }
}
