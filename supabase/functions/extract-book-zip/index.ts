import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { BlobReader, Uint8ArrayWriter, ZipReader } from "npm:@zip.js/zip.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function humanizePdfName(filename: string) {
  const base = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  if (!base) return filename;
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function sanitizeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function isPdfEntry(filename: string) {
  if (!filename.toLowerCase().endsWith(".pdf")) return false;
  if (filename.includes("__MACOSX")) return false;
  if (filename.split("/").some((part) => part.startsWith("."))) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let zipReader: ZipReader<Blob> | null = null;

  try {
    const { collectionId, zipPath } = await req.json();

    if (!collectionId || !zipPath) {
      return new Response(JSON.stringify({ error: "collectionId and zipPath are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Server configuration missing");
    }

    const client = createClient(supabaseUrl, serviceKey);

    const { data: zipBlob, error: downloadError } = await client.storage
      .from("book-files")
      .download(zipPath);

    if (downloadError || !zipBlob) {
      throw new Error(downloadError?.message || "Failed to download ZIP from storage");
    }

    zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();

    const pdfEntries = entries
      .filter((entry) => !entry.directory && isPdfEntry(entry.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    if (pdfEntries.length === 0) {
      throw new Error("No PDF files found in this ZIP");
    }

    const docRows: {
      collection_id: string;
      title: string;
      original_filename: string;
      file_path: string;
      file_size: number;
      sort_order: number;
    }[] = [];

    const stamp = Date.now();

    for (let i = 0; i < pdfEntries.length; i += 1) {
      const entry = pdfEntries[i];
      const name = entry.filename.split("/").pop() || entry.filename;
      const pdfData = await entry.getData(new Uint8ArrayWriter());
      const filePath = `extracted/${collectionId}/${stamp}_${i}_${sanitizeStorageName(name)}`;

      const { error: uploadError } = await client.storage.from("book-files").upload(filePath, pdfData, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        throw new Error(`Failed to upload ${name}: ${uploadError.message}`);
      }

      docRows.push({
        collection_id: collectionId,
        title: humanizePdfName(name),
        original_filename: name,
        file_path: filePath,
        file_size: pdfData.byteLength,
        sort_order: i,
      });
    }

    await zipReader.close();
    zipReader = null;

    const { error: docsError } = await client.from("book_documents").insert(docRows);
    if (docsError) throw docsError;

    const { error: updateError } = await client
      .from("book_collections")
      .update({
        document_count: docRows.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collectionId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, count: docRows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-book-zip error:", err);
    if (zipReader) {
      try {
        await zipReader.close();
      } catch {
        // ignore close errors
      }
    }
    return new Response(JSON.stringify({ error: err.message || "ZIP extraction failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
