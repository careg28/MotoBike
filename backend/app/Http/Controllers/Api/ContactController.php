<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(Request $request)
    {
        $data = $request->validate([
            'name' => ['required','string','max:200'],
            'email' => ['required','email','max:200'],
            'message' => ['required','string','max:2000'],
        ]);

        $admin = config('mail.admin_address') ?? env('ADMIN_EMAIL');

        if (!$admin) {
            return response()->json([
                'message' => 'Admin email not configured'
            ], 500);
        }

        $text = [];
        $text[] = "Nuevo mensaje desde la web";
        $text[] = "";
        $text[] = "Nombre: {$data['name']}";
        $text[] = "Email: {$data['email']}";
        $text[] = "";
        $text[] = "Mensaje:";
        $text[] = $data['message'];

        Mail::raw(implode("\n", $text), function ($m) use ($admin, $data) {
            $m->to($admin)
              ->replyTo($data['email'], $data['name'])
              ->subject('Nuevo mensaje desde la web');
        });

        return response()->json([
            'success' => true
        ]);
    }
}