<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    // GET /api/media
    public function index(Request $r)
    {
        $q = Media::query();
        if ($s = $r->get('search')) {
            $q->where('original_name', 'like', "%$s%");
        }
        return response()->json($q->orderByDesc('id')->paginate(24));
    }

    // POST /api/media  (multipart)
    public function store(Request $r)
    {
        $r->validate([
            'files'   => ['required','array'],
            'files.*' => ['file','mimes:jpg,jpeg,png,webp,gif','max:5120'], // 5MB
        ]);

        $saved = [];
        foreach ($r->file('files') as $file) {
            $ext  = strtolower($file->getClientOriginalExtension());
            $name = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $slug = Str::slug($name);
            $filename = $slug.'-'.Str::random(6).'.'.$ext;
            $path = $file->storeAs('motos', $filename, 'public');

            $saved[] = Media::create([
                'original_name' => $file->getClientOriginalName(),
                'filename'      => $filename,
                'mime'          => $file->getMimeType(),
                'size'          => $file->getSize(),
                'disk'          => 'public',
                'path'          => $path,
            ]);
        }

        return response()->json($saved, 201);
    }

    // DELETE /api/media/{id}
    public function destroy(int $id)
    {
        $m = Media::findOrFail($id);
        Storage::disk($m->disk)->delete($m->path);
        $m->delete();

        return response()->json(['deleted' => true]);
    }
}