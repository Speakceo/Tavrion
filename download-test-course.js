import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function downloadFile() {
  const filePath = '1770129644975_slack-channels-scorm12-T64YRPG3__1_.zip';

  const { data, error } = await supabase.storage
    .from('course-files')
    .download(filePath);

  if (error) {
    console.error('Error downloading:', error);
    return;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync('/tmp/test123.zip', buffer);
  console.log('Downloaded to /tmp/test123.zip');
}

downloadFile();
