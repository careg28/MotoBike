<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FrontendLogController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:100'],
            'page' => ['nullable', 'string', 'max:255'],
            'request_url' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'numeric'],
            'message' => ['nullable', 'string', 'max:2000'],
            'online' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:50'],
            'user_agent' => ['nullable', 'string', 'max:1000'],
            'timestamp' => ['nullable', 'string', 'max:100'],
        ]);

        Log::warning('Frontend error report', $data);

        return response()->json(['logged' => true]);
    }
}
